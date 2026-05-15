import React, {useState, useMemo, useEffect} from 'react';
import {View} from 'react-native';
import {colors} from '@theme';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import {DrawerContext} from '@app/DrawerContext';
import {CustomTabBar} from '@components/common';
import {DrawerMenu} from '@components/common';
import {useAppDispatch, useAppSelector} from '@app/hooks';
import {setUser, selectHasPerm} from '@features/auth/authSlice';
import {authApi} from '@api';

import DashboardScreen from '@screens/app/DashboardScreen';
import AttendanceScreen from '@screens/app/AttendanceScreen';
import LeaveScreen from '@screens/app/LeaveScreen';
import NotificationsScreen from '@screens/app/NotificationsScreen';
import RolesScreen from '@screens/admin/RolesScreen';
import DepartmentsScreen from '@screens/admin/DepartmentsScreen';
import OrgSettingsScreen from '@screens/admin/OrgSettingsScreen';
import UsersScreen from '@screens/admin/UsersScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';
import AnnouncementsScreen from '@screens/app/AnnouncementsScreen';
import EventsScreen from '@screens/app/EventsScreen';
import TasksScreen from '@screens/app/TasksScreen';
import EmployeesScreen from '@screens/admin/EmployeesScreen';
import EmployeeDetailScreen from '@screens/admin/EmployeeDetailScreen';
import DocumentsScreen from '@screens/app/DocumentsScreen';
import AttendanceHistoryScreen from '@screens/app/AttendanceHistoryScreen';
import ProjectsScreen from '@screens/app/ProjectsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const canLeave = useAppSelector(selectHasPerm('leave.view'));

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}>
      <Tab.Screen name="Dashboard"     component={DashboardScreen} />
      <Tab.Screen name="Attendance"    component={AttendanceScreen} />
      {canLeave && <Tab.Screen name="Leave" component={LeaveScreen} />}
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
}

function MainShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const dispatch = useAppDispatch();

  // Refresh user + permissions on every app open so admin role changes take effect immediately
  useEffect(() => {
    authApi.me()
      .then(user => dispatch(setUser(user)))
      .catch(() => {});
  }, [dispatch]);

  const drawerCtx = useMemo(
    () => ({
      toggle: () => setDrawerOpen(v => !v),
      close: () => setDrawerOpen(false),
    }),
    [],
  );

  return (
    <DrawerContext.Provider value={drawerCtx}>
      <View style={{flex: 1}}>
        <TabNavigator />
        <DrawerMenu
          visible={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
      </View>
    </DrawerContext.Provider>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
      }}>
      <Stack.Screen name="Main" component={MainShell} />
      <Stack.Screen name="Roles" component={RolesScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="OrgSettings" component={OrgSettingsScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="Events" component={EventsScreen} />
      <Stack.Screen name="Tasks"           component={TasksScreen} />
      <Stack.Screen name="Employees"      component={EmployeesScreen} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} />
      <Stack.Screen name="Documents"         component={DocumentsScreen} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
      <Stack.Screen name="Projects"          component={ProjectsScreen} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{animation: 'slide_from_bottom'}}
      />
    </Stack.Navigator>
  );
}
