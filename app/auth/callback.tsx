import { ActivityIndicator, Text } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { Button, Notice, Shell, styles } from '../../components/ui';

export default function Callback() {
  const { session, loading, error } = useAuth();
  const params = useLocalSearchParams<{ error_description?: string }>();
  const router = useRouter();
  if (loading) return <Shell><ActivityIndicator /></Shell>;
  if (session) return <Redirect href="/home" />;
  return <Shell><Text style={styles.title}>Email confirmation</Text><Notice error={!!(error || params.error_description)} text={params.error_description || error || 'If your email is confirmed, sign in to continue. If the link expired, use “Need a new confirmation email?” on the sign-in screen.'} /><Button title="Go to sign in" onPress={() => router.replace('/')} /></Shell>;
}
