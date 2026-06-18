/**
 * @file src/components/common/AccountStateGate.jsx
 * @description Mobile parity with the web AccountStateGate. Reacts to the org's
 * `accountState` (from getOrgInfo):
 *   - hardBlocked (SUSPENDED / CANCELLED) → full-screen blocking modal; the app
 *     is unusable except "Talk to support" / "Log out".
 *   - writeBlocked (TRIAL_EXPIRED / SUBSCRIPTION_EXPIRED) → persistent top banner;
 *     admins are told to upgrade on the web, staff to ask their admin.
 *   - trial (active) → dismissible "N days left" banner.
 * The backend orgScope middleware is the real enforcer — this is the UX layer.
 */
import React, {useState} from 'react';
import {View, Modal, TouchableOpacity, StyleSheet, Linking} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AlertTriangle, XCircle, X} from 'lucide-react-native';
import {useColors} from '@app/ThemeContext';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {logout, selectIsAdmin} from '@features/auth/authSlice';
import {authApi} from '@api';
import AppText from '@components/ui/AppText';
import {Button} from '@components/ui';
import {spacing, fontSize, fontWeight, radius} from '@theme';

const SUPPORT_URL = 'https://onepulsework.com/contact';

export default function AccountStateGate({accountState}) {
  const s = accountState;
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const [trialDismissed, setTrialDismissed] = useState(false);

  if (!s) return null;

  async function handleLogout() {
    try { await authApi.logout(); } catch (_) {}
    dispatch(logout());
  }

  // ── Hard block: suspended / cancelled ─────────────────────────────────────
  if (s.hardBlocked) {
    const cancelled = s.reason === 'CANCELLED';
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.overlay}>
          <View style={[styles.card, {backgroundColor: colors.surface}]}>
            <View style={[styles.iconWrap, {backgroundColor: colors.errorLight}]}>
              <XCircle size={30} color={colors.error} />
            </View>
            <AppText style={[styles.title, {color: colors.text}]}>
              {cancelled ? 'Account closed' : 'Account suspended'}
            </AppText>
            <AppText style={[styles.body, {color: colors.textSecondary}]}>
              {cancelled
                ? 'This organisation’s account has been closed. Please talk to support if you believe this is a mistake.'
                : 'Access to this organisation has been suspended. Please talk to support to restore access.'}
            </AppText>
            <Button label="Talk to support" onPress={() => Linking.openURL(SUPPORT_URL)} style={{marginTop: spacing[2]}} />
            <Button label="Log out" variant="outline" onPress={handleLogout} style={{marginTop: spacing[2]}} />
          </View>
        </View>
      </Modal>
    );
  }

  // ── Write block: trial / subscription expired (persistent banner) ─────────
  if (s.writeBlocked) {
    const trial = s.reason === 'TRIAL_EXPIRED';
    return (
      <View pointerEvents="box-none" style={[styles.bannerWrap, {top: insets.top + spacing[1]}]}>
        <View style={[styles.banner, {backgroundColor: colors.errorLight, borderColor: colors.error + '55'}]}>
          <AlertTriangle size={16} color={colors.error} />
          <AppText style={[styles.bannerText, {color: colors.text}]}>
            {trial ? 'Your free trial has ended.' : 'Your subscription is inactive.'}{' '}
            {isAdmin ? 'Upgrade on the web dashboard to restore full access.' : 'Ask your administrator to upgrade the plan.'}
          </AppText>
        </View>
      </View>
    );
  }

  // ── Trial active: dismissible "N days left" banner ────────────────────────
  if (s.state === 'trial' && s.daysLeftInTrial != null && !trialDismissed) {
    const d = s.daysLeftInTrial;
    return (
      <View pointerEvents="box-none" style={[styles.bannerWrap, {top: insets.top + spacing[1]}]}>
        <View style={[styles.banner, {backgroundColor: colors.infoLight, borderColor: colors.info + '55'}]}>
          <AppText style={[styles.bannerText, {color: colors.text}]}>
            {d === 0 ? 'Your free trial ends today.' : `${d} day${d === 1 ? '' : 's'} left in your free trial.`}
            {isAdmin ? ' Upgrade on the web dashboard.' : ''}
          </AppText>
          <TouchableOpacity onPress={() => setTrialDismissed(true)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <X size={15} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  // Hard-block modal
  overlay: {flex: 1, backgroundColor: 'rgba(13,19,38,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing[5]},
  card: {width: '100%', maxWidth: 420, borderRadius: radius.lg, padding: spacing[6], alignItems: 'center'},
  iconWrap: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[4]},
  title: {fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing[2], textAlign: 'center'},
  body: {fontSize: fontSize.sm, lineHeight: 21, textAlign: 'center', marginBottom: spacing[4]},

  // Floating banners
  bannerWrap: {position: 'absolute', left: spacing[3], right: spacing[3], zIndex: 9998},
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing[3], paddingHorizontal: spacing[4],
    shadowColor: '#0D1326', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  bannerText: {flex: 1, fontSize: 12.5, fontWeight: fontWeight.semiBold, lineHeight: 17},
});
