import React, {useState, useRef} from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform,
  ActivityIndicator, StatusBar, Image,
} from 'react-native';
import logo3 from '@assets/OnePulseWork_logo_1.png';
import {Eye, EyeOff} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';
import {authApi} from '@api';
import {useIsDark} from '@app/ThemeContext';

const DARK = {
  bg: '#080C1A', cardBg: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(255,255,255,0.11)',
  inputBg: 'rgba(255,255,255,0.07)', inputBorder: 'rgba(255,255,255,0.13)',
  inputFocus: '#7B61FF', text: '#EEF0FF', muted: 'rgba(230,232,255,0.52)',
  faint: 'rgba(230,232,255,0.28)', primary: '#7B61FF',
  error: '#FF5C5C', errorBg: 'rgba(255,92,92,0.12)',
  success: '#34D399', successBg: 'rgba(52,211,153,0.12)',
  white: '#FFFFFF', divider: 'rgba(255,255,255,0.08)',
};
const LIGHT = {
  bg: '#F2F4FF', cardBg: 'rgba(255,255,255,0.85)', cardBorder: 'rgba(123,97,255,0.15)',
  inputBg: 'rgba(255,255,255,0.9)', inputBorder: 'rgba(123,97,255,0.2)',
  inputFocus: '#7B61FF', text: '#12102A', muted: 'rgba(30,20,80,0.55)',
  faint: 'rgba(30,20,80,0.35)', primary: '#7B61FF',
  error: '#D93636', errorBg: 'rgba(217,54,54,0.08)',
  success: '#059669', successBg: 'rgba(5,150,105,0.08)',
  white: '#FFFFFF', divider: 'rgba(30,20,80,0.1)',
};

function Field({label, error, C, secureTextEntry, ...rest}) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const isPassword = secureTextEntry === true;
  return (
    <View style={styles.fieldWrap}>
      <AppText style={[styles.label, {color: C.muted}]}>{label}</AppText>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, {
            backgroundColor: C.inputBg,
            borderColor: error ? C.error : focused ? C.inputFocus : C.inputBorder,
            color: C.text,
            paddingRight: isPassword ? 48 : spacing[4],
          }]}
          placeholderTextColor={C.faint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !shown}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShown(v => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.6}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {shown
              ? <EyeOff size={18} color={C.muted} strokeWidth={1.8} />
              : <Eye    size={18} color={C.muted} strokeWidth={1.8} />
            }
          </TouchableOpacity>
        )}
      </View>
      {error ? <AppText style={[styles.errorText, {color: C.error}]}>{error}</AppText> : null}
    </View>
  );
}

export default function ForgotPasswordScreen({navigation}) {
  const isDark = useIsDark();
  const C = isDark ? DARK : LIGHT;
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const otpRefs = useRef([]);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setFieldErrors({email: 'Enter a valid email address'});
      return;
    }
    setFieldErrors({});
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setStep('otp');
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── OTP digit handling ─────────────────────────────────────────────────────
  function handleOtpChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit) return; // backspace is handled entirely by onKeyPress
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyPress(index, e) {
    if (e.nativeEvent.key !== 'Backspace') return;
    const next = [...otp];
    if (next[index]) {
      // box has a value → clear it, stay on same box
      next[index] = '';
      setOtp(next);
    } else if (index > 0) {
      // box already empty → move to previous and clear it
      next[index - 1] = '';
      setOtp(next);
      // setTimeout defers focus to after the render cycle so it isn't cancelled
      const prev = index - 1;
      setTimeout(() => otpRefs.current[prev]?.focus(), 0);
    }
  }

  // ── Step 2: verify OTP + reset password ────────────────────────────────────
  async function handleReset() {
    const otpStr = otp.join('');
    const errs = {};
    if (otpStr.length !== 6) errs.otp = 'Enter the 6-digit code from your email';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 8) errs.newPassword = 'Min 8 characters';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setFieldErrors({});
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(email, otpStr, newPassword);
      // Navigate back to login with success message
      navigation.replace('Login', {resetSuccess: true});
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, {backgroundColor: C.bg}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} translucent />

      {/* Orbs */}
      <View style={[styles.orb1, {backgroundColor: isDark ? 'rgba(123,97,255,0.15)' : 'rgba(123,97,255,0.10)'}]} />
      <View style={[styles.orb2, {backgroundColor: isDark ? 'rgba(29,111,255,0.09)' : 'rgba(29,111,255,0.06)'}]} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, {paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[6]}]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <AppText style={[styles.backArrow, {color: C.muted}]}>←</AppText>
            <AppText style={[styles.backLabel, {color: C.muted}]}>Back to sign in</AppText>
          </TouchableOpacity>

          {/* Logo mark */}
          <View style={styles.brand}>
            <Image source={logo3} style={styles.logoImg} resizeMode="contain" />
            <AppText style={[styles.brandName, {color: C.text}]}>
              {'One'}
              <AppText style={[styles.brandName, {color: '#7B61FF'}]}>P</AppText>
              <AppText style={[styles.brandName, {color: '#6B70FF'}]}>u</AppText>
              <AppText style={[styles.brandName, {color: '#5B7FFF'}]}>l</AppText>
              <AppText style={[styles.brandName, {color: '#4B8FFF'}]}>s</AppText>
              <AppText style={[styles.brandName, {color: '#3B9EFF'}]}>e</AppText>
              {'Work'}
            </AppText>
          </View>

          {/* Card */}
          <View style={[styles.card, {backgroundColor: C.cardBg, borderColor: C.cardBorder}]}>
            <View style={[styles.cardAccent, {backgroundColor: C.primary}]} />

            {step === 'email' ? (
              <>
                <AppText style={[styles.title, {color: C.text}]}>Forgot password?</AppText>
                <AppText style={[styles.sub, {color: C.muted}]}>
                  Enter your email and we'll send a 6-digit code.
                </AppText>

                {error ? (
                  <View style={[styles.banner, {backgroundColor: C.errorBg, borderColor: C.error + '40'}]}>
                    <View style={[styles.bannerDot, {backgroundColor: C.error}]} />
                    <AppText style={[styles.bannerText, {color: C.error}]}>{error}</AppText>
                  </View>
                ) : null}

                <Field
                  C={C} label="Email address" placeholder="you@company.com"
                  value={email} onChangeText={setEmail}
                  error={fieldErrors.email}
                  keyboardType="email-address" autoCapitalize="none"
                  autoCorrect={false} autoComplete="email"
                />

                <TouchableOpacity
                  style={[styles.btn, loading && {opacity: 0.7}]}
                  onPress={handleSendOtp} disabled={loading} activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <AppText style={styles.btnLabel}>Send code</AppText>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AppText style={[styles.title, {color: C.text}]}>Enter code</AppText>
                <AppText style={[styles.sub, {color: C.muted}]}>
                  We sent a code to{' '}
                  <AppText style={{color: C.text, fontWeight: fontWeight.semiBold}}>{email}</AppText>
                </AppText>

                {error ? (
                  <View style={[styles.banner, {backgroundColor: C.errorBg, borderColor: C.error + '40'}]}>
                    <View style={[styles.bannerDot, {backgroundColor: C.error}]} />
                    <AppText style={[styles.bannerText, {color: C.error}]}>{error}</AppText>
                  </View>
                ) : null}

                {/* OTP boxes */}
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={el => (otpRefs.current[i] = el)}
                      style={[styles.otpBox, {
                        backgroundColor: C.inputBg,
                        borderColor: digit ? C.primary : C.inputBorder,
                        color: C.text,
                      }]}
                      value={digit}
                      onChangeText={v => handleOtpChange(i, v)}
                      onKeyPress={e => handleOtpKeyPress(i, e)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                    />
                  ))}
                </View>
                {fieldErrors.otp ? (
                  <AppText style={[styles.errorText, {color: C.error, marginTop: -spacing[2], marginBottom: spacing[3]}]}>
                    {fieldErrors.otp}
                  </AppText>
                ) : null}

                <Field
                  C={C} label="New password" placeholder="Min 8 characters"
                  value={newPassword} onChangeText={setNewPassword}
                  error={fieldErrors.newPassword}
                  secureTextEntry
                />
                <Field
                  C={C} label="Confirm new password" placeholder="Repeat password"
                  value={confirmPassword} onChangeText={setConfirmPassword}
                  error={fieldErrors.confirmPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.btn, loading && {opacity: 0.7}]}
                  onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <AppText style={styles.btnLabel}>Reset password</AppText>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setStep('email'); setOtp(['','','','','','']); setError(null); }} style={styles.resendBtn}>
                  <AppText style={[styles.resendLabel, {color: C.primary}]}>
                    Use a different email
                  </AppText>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  orb1: {position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: 150},
  orb2: {position: 'absolute', bottom: 40, left: -80, width: 260, height: 260, borderRadius: 130},
  kav: {flex: 1},
  scroll: {paddingHorizontal: spacing[5], flexGrow: 1},

  backBtn: {flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[5]},
  backArrow: {fontSize: 20},
  backLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.medium},

  brand: {alignItems: 'center', marginBottom: spacing[6]},
  logoImg: {width: 200, height: 72, marginBottom: spacing[3]},
  brandName: {fontSize: 24, fontWeight: fontWeight.bold, letterSpacing: 0.3},

  card: {
    borderWidth: 1, borderRadius: 24, padding: spacing[6], overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 10,
  },
  cardAccent: {position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.7},
  title: {fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[1], marginTop: spacing[1]},
  sub: {fontSize: fontSize.sm, marginBottom: spacing[5]},

  banner: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: radius.md, padding: spacing[3], marginBottom: spacing[4], gap: spacing[2],
  },
  bannerDot: {width: 6, height: 6, borderRadius: 3, flexShrink: 0},
  bannerText: {fontSize: fontSize.sm, flex: 1},

  fieldWrap: {marginBottom: spacing[4]},
  label: {fontSize: fontSize.xs, fontWeight: fontWeight.semiBold, letterSpacing: 0.5, marginBottom: spacing[2], textTransform: 'uppercase'},
  inputWrap: {position: 'relative'},
  input: {borderWidth: 1.5, borderRadius: 14, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: fontSize.base},
  eyeBtn: {
    position: 'absolute', right: 14, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  errorText: {fontSize: fontSize.xs, marginTop: spacing[1]},

  otpRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing[4], gap: spacing[2]},
  otpBox: {
    flex: 1, height: 56, borderWidth: 2, borderRadius: 12,
    fontSize: 22, fontWeight: fontWeight.bold,
  },

  btn: {
    backgroundColor: '#7B61FF', borderRadius: 14,
    paddingVertical: spacing[4], alignItems: 'center', justifyContent: 'center',
    marginTop: spacing[2],
    shadowColor: '#7B61FF', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 6,
  },
  btnLabel: {color: '#FFFFFF', fontSize: fontSize.base, fontWeight: fontWeight.bold, letterSpacing: 0.3},

  resendBtn: {alignItems: 'center', marginTop: spacing[4]},
  resendLabel: {fontSize: fontSize.sm, fontWeight: fontWeight.medium},
});
