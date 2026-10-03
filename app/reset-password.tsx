import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Button, Field, Notice, Shell, styles } from '../components/ui';

export default function ResetPassword() {
  const { session, loading, error: sessionError } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function save() {
    if (busy) return;
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Your passwords do not match.');
    setBusy(true);
    try { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setDone(true); setPassword(''); setConfirm(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update your password.'); }
    finally { setBusy(false); }
  }
  if (loading) return <Shell><ActivityIndicator /></Shell>;
  return <Shell><Text style={styles.title}>Choose a new password.</Text>
    {!session || sessionError ? <><Notice error text={sessionError || 'This reset link has expired or is invalid. Return to sign in and use Forgot password to request a new link.'} /><Button title="Back to sign in" onPress={() => router.replace('/')} /></> : done ? <><Notice text="Your password has been updated." /><Button title="Continue to Wallet" onPress={() => router.replace('/home')} /></> : <><Field label="New password" value={password} onChangeText={setPassword} password newPassword /><Field label="Confirm new password" value={confirm} onChangeText={setConfirm} password newPassword onSubmit={save} />{!!error && <Notice error text={error} />}<Button title="Save new password" onPress={save} busy={busy} /></>}
  </Shell>;
}
