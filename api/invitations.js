const { createClient } = require('@supabase/supabase-js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function respond(res, status, body) {
  return res.status(status).json(body);
}

module.exports = async function sendGroupInvitation(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Use POST to send a group invitation.' });
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM || 'Wallet <onboarding@resend.dev>';
  const appUrl = process.env.APP_BASE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
  if (!supabaseUrl || !publishableKey || !resendKey || !appUrl) {
    return respond(res, 503, { error: 'Invitation email is not configured yet. Please try again later.' });
  }

  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respond(res, 401, { error: 'Please sign in again before sending an invitation.' });

  const gid = req.body?.gid;
  const email = typeof req.body?.invite_email === 'string' ? req.body.invite_email.trim().toLowerCase() : '';
  if (typeof gid !== 'string' || !UUID.test(gid) || email.length > 254 || !EMAIL.test(email)) {
    return respond(res, 400, { error: 'Check the group and email address, then try again.' });
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user?.email_confirmed_at) {
      return respond(res, 401, { error: 'Please sign in with your verified email address.' });
    }

    const { data: groupData, error: groupError } = await client.rpc('wallet_group', { gid });
    if (groupError || !groupData?.group?.name) {
      return respond(res, 403, { error: 'You do not have access to this group.' });
    }

    const { error: inviteError } = await client.rpc('wallet_invite', { gid, invite_email: email });
    if (inviteError) {
      const status = /admin|access|member/i.test(inviteError.message) ? 403 : 400;
      return respond(res, status, { error: inviteError.message });
    }

    const groupName = escapeHtml(groupData.group.name);
    const inviter = escapeHtml(authData.user.user_metadata?.display_name || authData.user.email || 'Someone in your group');
    const safeAppUrl = escapeHtml(appUrl.replace(/\/$/, ''));
    const html = `<div style="font-family:Arial,sans-serif;color:#17342e;line-height:1.6;max-width:560px;margin:32px auto;padding:24px"><h1 style="color:#17634f">You’re invited to share expenses</h1><p>${inviter} invited you to join <strong>${groupName}</strong> on Wallet.</p><p>Open Wallet and sign up or sign in with <strong>${escapeHtml(email)}</strong>. After you verify your email, the invitation will be waiting on your groups page.</p><p style="margin:28px 0"><a href="${safeAppUrl}" style="background:#17634f;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open Wallet</a></p><p style="font-size:13px;color:#60776f">This invitation expires in 14 days. If you weren’t expecting it, you can ignore this email.</p></div>`;
    const text = `${inviter} invited you to join ${groupData.group.name} on Wallet.\n\nSign up or sign in with ${email} at ${appUrl}. Verify your email, then accept the invitation on your groups page.\n\nThis invitation expires in 14 days. If you weren’t expecting it, you can ignore this email.`;

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Join ${groupData.group.name} on Wallet`,
        html,
        text,
      }),
    });
    const result = await sent.json().catch(() => ({}));
    if (!sent.ok) {
      console.error('Wallet invitation email was rejected by the provider.', sent.status, result.name || result.message || '');
      return respond(res, 502, { error: 'The invitation was saved, but the email could not be sent. Check the email setup and try again.' });
    }
    return respond(res, 200, { message: `Invitation email sent to ${email}.` });
  } catch (error) {
    console.error('Wallet invitation request failed.', error instanceof Error ? error.message : 'Unknown error');
    return respond(res, 500, { error: 'Wallet could not send that invitation. Please try again.' });
  }
};

module.exports.escapeHtml = escapeHtml;
