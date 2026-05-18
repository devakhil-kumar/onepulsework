import React, {useState} from 'react';
import {
  View, StyleSheet, StatusBar, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {
  setCredentials, setLoading, setError,
  selectAuthLoading, selectAuthError,
} from '@features/auth/authSlice';
import {authApi} from '@api';
import {useIsDark} from '@app/ThemeContext';

const DARK = {
  bg:          '#080C1A',
  cardBg:      'rgba(255,255,255,0.06)',
  cardBorder:  'rgba(255,255,255,0.11)',
  inputBg:     'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.13)',
  inputFocus:  '#7B61FF',
  text:        '#EEF0FF',
  muted:       'rgba(230,232,255,0.52)',
  faint:       'rgba(230,232,255,0.28)',
  primary:     '#7B61FF',
  error:       '#FF5C5C',
  errorBg:     'rgba(255,92,92,0.12)',
  orb1:        'rgba(123,97,255,0.18)',
  orb2:        'rgba(29,111,255,0.11)',
  orb3:        'rgba(123,97,255,0.07)',
  dot:         '#7B61FF',
  accentLine:  '#7B61FF',
  divider:     'rgba(255,255,255,0.08)',
  white:       '#FFFFFF',
};

const LIGHT = {
  bg:          '#F2F4FF',
  cardBg:      'rgba(255,255,255,0.85)',
  cardBorder:  'rgba(123,97,255,0.15)',
  inputBg:     'rgba(255,255,255,0.9)',
  inputBorder: 'rgba(123,97,255,0.2)',
  inputFocus:  '#7B61FF',
  text:        '#12102A',
  muted:       'rgba(30,20,80,0.55)',
  faint:       'rgba(30,20,80,0.35)',
  primary:     '#7B61FF',
  error:       '#D93636',
  errorBg:     'rgba(217,54,54,0.08)',
  orb1:        'rgba(123,97,255,0.12)',
  orb2:        'rgba(29,111,255,0.08)',
  orb3:        'rgba(123,97,255,0.06)',
  dot:         '#7B61FF',
  accentLine:  '#7B61FF',
  divider:     'rgba(30,20,80,0.1)',
  white:       '#FFFFFF',
};

// ── Custom input with focus ring ───────────────────────────────────────────

function Field({label, error, C, ...rest}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <AppText style={[styles.label, {color: C.muted}]}>{label}</AppText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: C.inputBg,
            borderColor: error ? C.error : focused ? C.inputFocus : C.inputBorder,
            color: C.text,
          },
        ]}
        placeholderTextColor={C.faint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error ? (
        <AppText style={[styles.errorText, {color: C.error}]}>{error}</AppText>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const isDark   = useIsDark();
  const C        = isDark ? DARK : LIGHT;
  const insets   = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const loading  = useAppSelector(selectAuthLoading);
  const authError = useAppSelector(selectAuthError);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    dispatch(setError(null));
    dispatch(setLoading(true));
    try {
      const data = await authApi.login(email.trim().toLowerCase(), password);
      dispatch(setCredentials({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      }));
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Login failed. Please try again.';
      dispatch(setError(msg));
    } finally {
      dispatch(setLoading(false));
    }
  }

  return (
    <View style={[styles.root, {backgroundColor: C.bg}]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
        translucent
      />

      {/* ── Decorative background orbs ── */}
      <View style={[styles.orb1, {backgroundColor: C.orb1}]} />
      <View style={[styles.orb2, {backgroundColor: C.orb2}]} />
      <View style={[styles.orb3, {backgroundColor: C.orb3}]} />
      {/* Subtle grid lines */}
      <View style={styles.gridOverlay} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {paddingTop: insets.top + spacing[6], paddingBottom: insets.bottom + spacing[6]},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Brand / Logo ── */}
          <View style={styles.brand}>
            {/* Logo mark with glow ring */}
            <View style={styles.logoGlow}>
              <View style={styles.logoBox}>
                <AppText style={styles.logoText}>CP</AppText>
              </View>
            </View>

            {/* <AppText style={[styles.brandName, {color: C.text}]}>OnePulseWork</AppText> */}
            <AppText style={[styles.brandName, {color: C.text}]}>CyberPulse</AppText>
            <AppText style={[styles.brandSub, {color: C.muted}]}>
              Workforce management, simplified
            </AppText>

            {/* Decorative dot row */}
            <View style={styles.dotRow}>
              {[0,1,2,3,4].map(i => (
                <View
                  key={i}
                  style={[styles.dot, {backgroundColor: C.dot, opacity: i === 2 ? 1 : i === 1 || i === 3 ? 0.5 : 0.2}]}
                />
              ))}
            </View>
          </View>

          {/* ── Glass card ── */}
          <View style={[styles.card, {backgroundColor: C.cardBg, borderColor: C.cardBorder}]}>
            {/* Card inner top accent line */}
            <View style={[styles.cardAccent, {backgroundColor: C.accentLine}]} />

            <AppText style={[styles.cardTitle, {color: C.text}]}>Sign in to your account</AppText>
            <AppText style={[styles.cardSub, {color: C.muted}]}>
              Enter your credentials below
            </AppText>

            {authError ? (
              <View style={[styles.errorBanner, {backgroundColor: C.errorBg, borderColor: C.error + '40'}]}>
                <View style={[styles.errorDot, {backgroundColor: C.error}]} />
                <AppText style={[styles.errorMsg, {color: C.error}]}>{authError}</AppText>
              </View>
            ) : null}

            <Field
              C={C}
              label="Email address"
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Field
              C={C}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.signInBtn, loading && {opacity: 0.7}]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={C.white} size="small" />
              ) : (
                <AppText style={styles.signInLabel}>Sign In</AppText>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <View style={[styles.footerDivider, {backgroundColor: C.divider}]} />
            <AppText style={[styles.footerText, {color: C.faint}]}>
              © 2025 CyberPulse AU · Australia
            </AppText>
            <View style={[styles.footerDivider, {backgroundColor: C.divider}]} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {flex: 1},

  // ── Decorative orbs ──
  orb1: {
    position: 'absolute',
    top: -80, right: -80,
    width: 340, height: 340, borderRadius: 170,
  },
  orb2: {
    position: 'absolute',
    bottom: 60, left: -100,
    width: 300, height: 300, borderRadius: 150,
  },
  orb3: {
    position: 'absolute',
    top: '45%', right: -60,
    width: 180, height: 180, borderRadius: 90,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    backgroundColor: 'transparent',
  },

  kav:    {flex: 1},
  scroll: {paddingHorizontal: spacing[5], flexGrow: 1},

  // ── Brand ──
  brand: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  logoGlow: {
    width: 96, height: 96, borderRadius: 28,
    backgroundColor: 'rgba(123,97,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing[5],
    shadowColor: '#7B61FF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8, shadowRadius: 24, elevation: 12,
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26, fontWeight: fontWeight.bold, letterSpacing: 1,
  },
  brandName: {
    fontSize: 24, fontWeight: fontWeight.bold,
    letterSpacing: 0.3, marginBottom: spacing[2],
  },
  brandSub: {
    fontSize: fontSize.sm, letterSpacing: 0.2, marginBottom: spacing[4],
  },
  dotRow: {flexDirection: 'row', gap: spacing[2], alignItems: 'center'},
  dot:    {width: 5, height: 5, borderRadius: 3},

  // ── Glass card ──
  card: {
    borderWidth: 1, borderRadius: 24,
    padding: spacing[6], overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, opacity: 0.7,
  },
  cardTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold,
    marginBottom: spacing[1], marginTop: spacing[1],
  },
  cardSub: {
    fontSize: fontSize.sm,
    marginBottom: spacing[5],
  },

  // ── Error banner ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  errorMsg: {
    fontSize: fontSize.sm,
    flex: 1,
  },

  // ── Field ──
  fieldWrap: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semiBold,
    letterSpacing: 0.5,
    marginBottom: spacing[2],
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: fontSize.base,
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing[1],
  },

  // ── Sign In button ──
  signInBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 14,
    paddingVertical: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
    shadowColor: '#7B61FF',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  signInLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },

  // ── Footer ──
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[8],
    gap: spacing[3],
  },
  footerDivider: {flex: 1, height: 1},
  footerText:    {fontSize: fontSize.xs},
});
