import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

export const colors = { ink: '#182E29', muted: '#5B7068', green: '#205A47', pale: '#EAF1EB', paper: '#F7F8F2', line: '#DCE3DB' };
export function Button({ title, onPress, busy = false, secondary = false }: { title: string; onPress: () => void; busy?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && { opacity: .8 }, busy && { opacity: .65 }]}>
    {busy ? <ActivityIndicator color={secondary ? colors.green : '#fff'} /> : <Text style={[styles.buttonText, secondary && { color: colors.green }]}>{title}</Text>}
  </Pressable>;
}
export function Field({ label, value, onChangeText, password = false, email = false, newPassword = false, onSubmit }: { label: string; value: string; onChangeText: (value: string) => void; password?: boolean; email?: boolean; newPassword?: boolean; onSubmit?: () => void }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const input = <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry={password && !passwordVisible} autoCapitalize="none" autoCorrect={false} keyboardType={email ? 'email-address' : 'default'} autoComplete={email ? 'email' : password ? newPassword ? 'new-password' : 'current-password' : 'name'} onSubmitEditing={onSubmit} style={password ? styles.passwordTextInput : styles.input} />;
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text>{password ? <View style={styles.passwordInput}>{input}<Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} accessibilityState={{ selected: passwordVisible }} hitSlop={6} onPress={() => setPasswordVisible(visible => !visible)} style={({ pressed }) => [styles.revealButton, pressed && { opacity: .65 }]}><View style={styles.eyeShape}><View style={styles.eyePupil}/></View>{passwordVisible && <View pointerEvents="none" style={styles.eyeSlash}/>}</Pressable></View> : input}</View>;
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
        <View style={[styles.illustration, !wide && styles.illustrationCompact]}><Text style={styles.illustrationEyebrow}>LESS MATH. MORE MEMORIES.</Text><CurrencyArtwork/><Text style={styles.illustrationCaption}>One shared place for every shared expense.</Text></View>
      </View>
      <View style={[styles.card, wide && { width: 440 }]}>{children}</View>
    </View><Text style={styles.footer}>Made for the people you share life with.</Text>
  </ScrollView>;
}

function CurrencyArtwork() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return <View style={styles.currencyArtwork}>
    <Image
      accessible
      accessibilityLabel="Animated illustration of dollar, euro, rupee, pound, and yen symbols with their national flags"
      source={reduceMotion ? require('../assets/currency-world-poster.png') : require('../assets/currency-world.gif')}
      resizeMode="cover"
      style={styles.currencyImage}
    />
  </View>;
}

export const styles = StyleSheet.create({
  top: { paddingHorizontal: 28, paddingVertical: 24, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  logo: { fontSize: 29, fontWeight: '700', color: colors.green, letterSpacing: -1 }, tag: { fontSize: 10, letterSpacing: 1.6, color: colors.muted },
  body: { padding: 24, paddingVertical: 40, width: '100%', maxWidth: 1180, alignSelf: 'center', flex: 1, gap: 32 }, story: { gap: 20 },
  eyebrow: { color: colors.green, letterSpacing: 2, fontSize: 11, fontWeight: '700' }, headline: { fontSize: 54, lineHeight: 61, fontWeight: '700', color: colors.ink, letterSpacing: -2 },
  description: { fontSize: 17, lineHeight: 27, color: colors.muted, maxWidth: 440 }, illustration: { marginTop: 16, padding: 26, borderRadius: 18, backgroundColor: '#E8EEDC', gap: 12, overflow: 'hidden' }, illustrationCompact: { padding: 18, marginTop: 4, gap: 8 }, illustrationEyebrow: { color: colors.muted, fontSize: 12, letterSpacing: 1.2, fontWeight: '600' }, illustrationCaption: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '500' }, currencyArtwork: { width: '100%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#09244A' }, currencyImage: { width: '100%', aspectRatio: 1.5 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 28, gap: 20 }, title: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -.7 }, subtitle: { fontSize: 15, lineHeight: 23, color: colors.muted },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink }, input: { minHeight: 50, borderWidth: 1, borderColor: '#B7C5BD', borderRadius: 10, paddingHorizontal: 14, fontSize: 16, color: colors.ink, backgroundColor: '#FCFDFB' }, passwordInput: { minHeight: 50, borderWidth: 1, borderColor: '#B7C5BD', borderRadius: 10, paddingLeft: 14, paddingRight: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FCFDFB' }, passwordTextInput: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 10, fontSize: 16, color: colors.ink }, revealButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, eyeShape: { width: 19, height: 13, borderWidth: 1.7, borderColor: colors.muted, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, eyePupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green }, eyeSlash: { position: 'absolute', height: 1.7, width: 25, borderRadius: 2, backgroundColor: colors.muted, transform: [{ rotate: '-38deg' }] },
  button: { minHeight: 50, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }, buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' }, secondary: { backgroundColor: colors.pale },
  notice: { backgroundColor: colors.pale, color: colors.green, padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 21 }, link: { color: colors.green, fontSize: 14, fontWeight: '600', paddingVertical: 8 }, footer: { textAlign: 'center', color: colors.muted, fontSize: 12, padding: 24 },
});
