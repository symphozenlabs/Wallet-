import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

export const colors = { ink: '#182E29', muted: '#5B7068', green: '#205A47', pale: '#EAF1EB', paper: '#F7F8F2', line: '#DCE3DB' };
export function Button({ title, onPress, busy = false, secondary = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && { opacity: .8 }, busy && { opacity: .65 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.green : '#fff'} /> : <Text style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, value, onChangeText, password = false, email = false, newPassword = false, onSubmit }: { label: string; value: string; onChangeText: (value: string) => void; password?: boolean; email?: boolean; newPassword?: boolean; onSubmit?: () => void }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry={password} autoCapitalize="none" autoCorrect={false} keyboardType={email ? 'email-address' : 'default'} autoComplete={email ? 'email' : password ? newPassword ? 'new-password' : 'current-password' : 'name'} onSubmitEditing={onSubmit} style={styles.input} /></View>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  return <Text accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.notice, error && { color: '#8B2929', backgroundColor: '#FFF0EC' }]}>{text}</Text>;
}
export function Shell({ children }: { children: ReactNode }) {
  const wide = useWindowDimensions().width >= 900;
  return <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    <View style={styles.top}><Text style={styles.logo}>◈ wallet</Text><Text style={styles.tag}>GOOD COMPANY. CLEAR BALANCES.</Text></View>
    <View style={[styles.body, wide && { flexDirection: 'row', alignItems: 'center', gap: 80 }]}>
      <View style={[styles.story, wide && { flex: 1 }]}>
        <Text style={styles.eyebrow}>SHARE THE MOMENTS</Text><Text style={[styles.headline, !wide && { fontSize: 38, lineHeight: 44 }]}>Together is better.{'\n'}Splitting is simpler.</Text>
        <Text style={styles.description}>Weekend trips. Shared homes. Dinner with friends. Keep track of expenses, so you can get back to the good stuff.</Text>
        {wide && <View style={styles.illustration}><Text style={{ color: colors.muted, fontSize: 13, letterSpacing: 1 }}>LESS MATH. MORE MEMORIES.</Text><Text style={{ fontSize: 66, color: colors.green }}>↗  ◈  ↙</Text><Text style={{ color: colors.ink, fontSize: 18 }}>One shared place for every shared expense.</Text></View>}
      </View>
      <View style={[styles.card, wide && { width: 440 }]}>{children}</View>
    </View><Text style={styles.footer}>Made for the people you share life with.</Text>
  </ScrollView>;
}
export const styles = StyleSheet.create({
  top: { paddingHorizontal: 28, paddingVertical: 24, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  logo: { fontSize: 29, fontWeight: '700', color: colors.green, letterSpacing: -1 }, tag: { fontSize: 10, letterSpacing: 1.6, color: colors.muted },
  body: { padding: 24, paddingVertical: 40, width: '100%', maxWidth: 1180, alignSelf: 'center', flex: 1, gap: 32 }, story: { gap: 20 },
  eyebrow: { color: colors.green, letterSpacing: 2, fontSize: 11, fontWeight: '700' }, headline: { fontSize: 54, lineHeight: 61, fontWeight: '700', color: colors.ink, letterSpacing: -2 },
  description: { fontSize: 17, lineHeight: 27, color: colors.muted, maxWidth: 440 }, illustration: { marginTop: 16, padding: 28, borderRadius: 18, backgroundColor: '#E8EEDC', gap: 16 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 28, gap: 20 }, title: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -.7 }, subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink }, input: { minHeight: 50, borderWidth: 1, borderColor: '#B7C5BD', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: colors.ink, backgroundColor: '#FCFDFB' },
  button: { minHeight: 50, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' }, secondary: { backgroundColor: colors.pale },
  notice: { backgroundColor: colors.pale, color: colors.green, padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 21 }, link: { color: colors.green, fontSize: 14, fontWeight: '600', paddingVertical: 8 }, footer: { textAlign: 'center', color: colors.muted, fontSize: 12, padding: 24 },
});
