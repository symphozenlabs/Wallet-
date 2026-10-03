import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { supabase, webRedirect } from '../lib/supabase';
import { Button, Field, Notice, Shell, styles } from '../components/ui';

export default function Welcome() {
  const { session, loading, error: sessionError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'resend'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function changeMode(next: typeof mode) { setMode(next); setMessage(''); setError(''); setPassword(''); }
  async function submit() {
    if (busy) return;
    setError(''); setMessage('');
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Please enter a valid email address.');
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name.');
    if ((mode === 'login' || mode === 'signup') && (!password || (mode === 'signup' && password.length < 8))) return setError('Please enter your password. New passwords need at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'resend') {
        const { error } = await supabase.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: webRedirect('/auth/callback') } });
        if (error) throw error;
        setMessage('If your account needs confirmation, a fresh link is on its way. Check your inbox and spam folder.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: webRedirect('/reset-password') });
        if (error) throw error;
        setMessage('If this email has an account, a password reset link is on its way. Check your inbox and spam folder.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: address, password, options: { data: { display_name: name.trim() }, emailRedirectTo: webRedirect('/auth/callback') } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email for a confirmation link. Once confirmed, you can sign in to Wallet.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: address, password });
        if (error) throw error;
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  if (loading) return <Shell><ActivityIndicator accessibilityLabel="Loading account" /></Shell>;
  if (session) return <Redirect href="/home" />;
  return <Shell>
    <View style={{ gap: 8 }}><Text style={styles.title}>{mode === 'signup' ? 'Your next shared adventure.' : mode === 'login' ? 'Welcome back.' : mode === 'resend' ? 'Confirm your email.' : 'Forgot your password?'}</Text><Text style={styles.subtitle}>{mode === 'signup' ? 'Create your account. Keep expenses clear.' : mode === 'login' ? 'Sign in to pick up where you left off.' : mode === 'resend' ? 'Request a fresh email confirmation link.' : 'We’ll email you a link to choose a new password.'}</Text></View>
    {mode === 'signup' && <Field label="Your name" value={name} onChangeText={setName} />}
    <Field label="Email address" value={email} onChangeText={setEmail} email />
    {(mode === 'signup' || mode === 'login') && <Field label={mode === 'signup' ? 'Password · at least 8 characters' : 'Password'} value={password} onChangeText={setPassword} password newPassword={mode === 'signup'} onSubmit={submit} />}
    {(!!error || !!sessionError) && <Notice text={error || sessionError!} error />}{!!message && <Notice text={message} />}
    <Button title={mode === 'signup' ? 'Create account' : mode === 'login' ? 'Sign in' : mode === 'resend' ? 'Resend confirmation' : 'Send reset link'} onPress={submit} busy={busy} />
    {mode === 'login' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('forgot')}><Text style={styles.link}>Forgot password?</Text></Pressable>}
    {(mode === 'signup' || mode === 'login') && <Pressable accessibilityRole="button" disabled={busy} onPress={() => changeMode('resend')}><Text style={styles.link}>Need a new confirmation email?</Text></Pressable>}
    <Button secondary title={mode === 'signup' ? 'Already have an account? Sign in' : mode === 'forgot' || mode === 'resend' ? 'Back to sign in' : 'New here? Create an account'} onPress={() => changeMode(mode === 'signup' || mode === 'forgot' || mode === 'resend' ? 'login' : 'signup')} busy={busy} />
    {mode === 'signup' && <Text style={styles.subtitle}>Verify your email before joining groups and sharing expenses.</Text>}
  </Shell>;
}
