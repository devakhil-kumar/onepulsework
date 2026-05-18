import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {getStackNav} from '@navigation/stackNav';
import {
  Home, Clock, Umbrella, Bell, Users, CalendarDays,
  Banknote, FolderOpen, Briefcase, Megaphone, Calendar,
  FileText, UserCog, Shield, Building2, Settings, LogOut, ChevronRight,
  ClipboardList,
} from 'lucide-react-native';
import {colors, spacing, fontSize, fontWeight, radius} from '@theme';
import AppText from '@components/ui/AppText';
import Avatar from '@components/ui/Avatar';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {logout, selectUser, selectIsAdmin, selectCanManage, selectHasPerm} from '@features/auth/authSlice';
import {authApi} from '@api';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.82, 300);

const TAB_SCREENS = ['Dashboard', 'Attendance', 'Leave', 'Notifications'];

// Nav sections matching web sidebar exactly — filtered by runtime permissions
function useNavSections() {
  const isAdmin      = useAppSelector(selectIsAdmin);
  const canManage    = useAppSelector(selectCanManage);
  const canEmployees = useAppSelector(selectHasPerm('employees.view'));
  const canShifts    = useAppSelector(selectHasPerm('shifts.view'));
  const canLeave     = useAppSelector(selectHasPerm('leave.view'));
  const canPayroll   = useAppSelector(selectHasPerm('payroll.view'));
  const canProjects  = useAppSelector(s => {
    const perms = s.auth.user?.permissions;
    if (perms == null) return true;
    return ['projects.view', 'projects.viewAll', 'projects.manage'].some(p => perms.includes(p));
  });
  const canJobs      = useAppSelector(selectHasPerm('jobs.view'));
  const canTasks     = useAppSelector(selectHasPerm('tasks.view'));
  const canAnnounce  = useAppSelector(selectHasPerm('announcements.view'));
  const canEvents    = useAppSelector(selectHasPerm('events.view'));
  const canDocuments = useAppSelector(selectHasPerm('documents.view'));

  const sections = [
    {
      label: 'Overview',
      items: [
        {key: 'Dashboard', label: 'Dashboard', Icon: Home, tab: true},
      ],
    },
    {
      label: 'Workforce',
      items: [
        canEmployees && {key: 'Employees', label: 'Employees', Icon: Users},
        canShifts    && {key: 'Shifts',    label: 'Shifts',    Icon: CalendarDays},
        {key: 'Attendance', label: 'Attendance', Icon: Clock, tab: true},
        canLeave     && {key: 'Leave',      label: 'Leave',      Icon: Umbrella, tab: true},
      ].filter(Boolean),
    },
    canPayroll && {
      label: 'Finance',
      items: [
        {key: 'Payroll', label: canManage ? 'Payroll' : 'My Payslips', Icon: Banknote},
      ],
    },
    (canProjects || canJobs || canTasks) && {
      label: 'Work',
      items: [
        canProjects && {key: 'Projects', label: 'Projects', Icon: FolderOpen},
        canJobs     && {key: 'Jobs',     label: 'Jobs',     Icon: Briefcase},
        canTasks    && {key: 'Tasks',    label: 'Tasks',    Icon: ClipboardList},
      ].filter(Boolean),
    },
    (canAnnounce || canEvents) && {
      label: 'Team',
      items: [
        canAnnounce && {key: 'Announcements', label: 'Announcements', Icon: Megaphone},
        canEvents   && {key: 'Events',        label: 'Events',        Icon: Calendar},
      ].filter(Boolean),
    },
    {
      label: 'Other',
      items: [
        canDocuments && {key: 'Documents',     label: 'Documents',     Icon: FileText},
        {key: 'Notifications', label: 'Notifications', Icon: Bell, tab: true},
      ].filter(Boolean),
    },
    isAdmin && {
      label: 'Admin',
      items: [
        {key: 'Users',       label: 'Users',          Icon: UserCog},
        {key: 'Roles',       label: 'Roles & Permissions', Icon: Shield},
        {key: 'Departments', label: 'Departments',    Icon: Building2},
        {key: 'OrgSettings', label: 'Organisation',   Icon: Settings},
      ],
    },
  ]
    .filter(Boolean)
    .filter(s => s.items.length > 0);   // drop any section whose items all resolved to false

  return sections;
}

const STACK_SCREENS = ['Roles', 'Departments', 'OrgSettings', 'Users', 'Announcements', 'Events', 'Tasks', 'Employees', 'EmployeeDetail', 'Documents', 'AttendanceHistory', 'Projects', 'Payroll', 'PayrollDetail', 'Profile'];

export default function DrawerMenu({visible, onClose}) {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const sections = useNavSections();

  // Computed when drawer opens so the active item is always highlighted correctly
  const [activeTab, setActiveTab] = useState(null);

  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Compute which screen is currently active for highlighting
      const nav = getStackNav();
      if (nav) {
        const state = nav.getState();
        if (state) {
          if (state.index === 0) {
            // On the Main (tab) screen — find which tab is active
            const tabState = state.routes[0].state;
            setActiveTab(tabState ? (tabState.routes[tabState.index]?.name ?? 'Dashboard') : 'Dashboard');
          } else {
            setActiveTab(state.routes[state.index].name);
          }
        }
      }

      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideX, backdropOpacity]);

  function handleNavItem(item) {
    onClose();
    const nav = getStackNav();
    if (!nav) return;

    if (item.tab) {
      // Reset stack to just Main with the correct tab — no buildup
      nav.reset({index: 0, routes: [{name: 'Main', params: {screen: item.key}}]});
    } else if (STACK_SCREENS.includes(item.key)) {
      // Reset stack to [Main, TargetScreen] — one back press returns to Dashboard
      nav.reset({index: 1, routes: [{name: 'Main'}, {name: item.key}]});
    } else {
      nav.reset({index: 0, routes: [{name: 'Main'}]});
    }
  }

  async function handleLogout() {
    onClose();
    try { await authApi.logout(); } catch (_) {}
    dispatch(logout());
  }

  const ROLE_LABELS = {OWNER: 'Owner', ADMIN: 'Admin', MANAGER: 'Manager', EMPLOYEE: 'Employee'};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Backdrop — full screen tap to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.backdrop, {opacity: backdropOpacity}]}
          />
        </TouchableOpacity>

        {/* Drawer panel — absolutely on the left */}
        <Animated.View
          style={[
            styles.drawer,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom + spacing[2],
              transform: [{translateX: slideX}],
            },
          ]}>
          {/* Header — gradient-style with brand */}
          <View style={styles.header}>
            <View style={styles.logoMark}>
              <AppText style={styles.logoText}>CP</AppText>
            </View>
            <View style={styles.headerText}>
              {/* <AppText style={styles.brandName}>OnePulseWork</AppText> */}
              <AppText style={styles.brandName}>CyberPulse</AppText>
              <AppText style={styles.brandSub}>Workforce Platform</AppText>
            </View>
          </View>

          {/* Nav sections */}
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {sections.map(section => (
              <View key={section.label} style={styles.section}>
                <AppText style={styles.sectionLabel}>{section.label}</AppText>
                {section.items.map(item => {
                  const isActive = activeTab === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => handleNavItem(item)}
                      activeOpacity={0.7}
                      style={[styles.navItem, isActive && styles.navItemActive]}>
                      <item.Icon
                        size={17}
                        color={isActive ? colors.sidebarActiveText : colors.sidebarMuted}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      <AppText
                        style={[
                          styles.navLabel,
                          isActive && styles.navLabelActive,
                        ]}>
                        {item.label}
                      </AppText>
                      {isActive && (
                        <View style={styles.activeBar} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {/* Footer — user profile */}
          <View style={[styles.footer, {borderTopColor: colors.sidebarBorder}]}>
            <TouchableOpacity
              onPress={() => {
                onClose();
                const nav = getStackNav();
                nav?.reset({index: 1, routes: [{name: 'Main'}, {name: 'Profile'}]});
              }}
              style={styles.footerUser}
              activeOpacity={0.7}>
              <Avatar name={user?.fullName} size="sm" />
              <View style={styles.userInfo}>
                <AppText style={styles.userName} numberOfLines={1}>
                  {user?.fullName}
                </AppText>
                <AppText style={styles.userRole}>
                  {ROLE_LABELS[user?.role] ?? user?.role}
                </AppText>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <LogOut size={16} color={colors.sidebarMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.sidebar,
    // Shadow on right edge
    shadowColor: '#000',
    shadowOffset: {width: 4, height: 0},
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.sidebarBorder,
    gap: spacing[3],
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  headerText: {gap: 2},
  brandName: {
    color: colors.sidebarText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  brandSub: {
    color: colors.sidebarMuted,
    fontSize: fontSize.xs,
  },
  scroll: {flex: 1},
  scrollContent: {
    paddingVertical: spacing[3],
    paddingBottom: spacing[4],
  },
  section: {
    marginBottom: spacing[2],
  },
  sectionLabel: {
    color: colors.sidebarMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: 11,
    marginHorizontal: spacing[3],
    borderRadius: radius.md,
    gap: spacing[3],
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: colors.sidebarActive,
  },
  navLabel: {
    flex: 1,
    color: colors.sidebarMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  navLabelActive: {
    color: colors.sidebarActiveText,
    fontWeight: fontWeight.semiBold,
  },
  activeBar: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderTopWidth: 1,
    gap: spacing[3],
  },
  footerUser: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3], minWidth: 0,
  },
  userInfo: {flex: 1, minWidth: 0, gap: 2},
  userName: {
    color: colors.sidebarText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semiBold,
  },
  userRole: {
    color: colors.sidebarMuted,
    fontSize: fontSize.xs,
  },
  logoutBtn: {
    padding: spacing[2],
  },
});
