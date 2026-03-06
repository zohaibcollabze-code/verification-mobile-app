/**
 * MPVP — App Navigator (Dynamic Theme)
 * Auth-gated root navigator with AuthStack and AppNavigator.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useColors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useThemeStore } from '@/stores/themeStore';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { AssignmentsScreen } from '../screens/AssignmentsScreen';
import { AssignmentDetailScreen } from '../screens/AssignmentDetailScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { ForcePasswordChangeScreen } from '../screens/ForcePasswordChangeScreen';
import { AcceptRejectScreen } from '../screens/AcceptRejectScreen';
import InspectionNavigator from '../screens/inspection/InspectionNavigator';
import { RequestsScreen } from '../screens/RequestsScreen';
import SuccessScreen from '../screens/inspection/SuccessScreen';
import ApiErrorBoundary from '../components/ApiErrorBoundary';

// Wrap RequestsScreen with ApiErrorBoundary for crash recovery
function RequestsScreenWithBoundary() {
  return (
    <ApiErrorBoundary>
      <RequestsScreen />
    </ApiErrorBoundary>
  );
}

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Assignments: { active: 'grid', inactive: 'grid-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Notifications: { active: 'notifications', inactive: 'notifications-outline' },
  Profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

// ─── Bottom Tab Navigator ─────────────────────────────────
function MainTabs() {
  const Colors = useColors();
  const insets = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: 'bottom',
        sceneStyle: { backgroundColor: Colors.bgScreen },
        tabBarBackground: () => <View style={{ flex: 1, backgroundColor: Colors.bgCard }} />,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: Colors.bgCard,
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: 0,
          borderTopColor: Colors.borderDefault,
          elevation: 16,
          shadowOpacity: 0.15,
          shadowColor: '#000',
          zIndex: 50,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons?.active : icons?.inactive;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarBadge: route.name === 'Notifications' && unreadCount > 0 ? unreadCount : undefined,
        tabBarBadgeStyle: {
          backgroundColor: Colors.danger,
          fontSize: 9,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          color: '#FFF',
          fontWeight: '800',
        },
      })}
    >
      <Tab.Screen name="Assignments" component={AssignmentsScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Office' }} />
    </Tab.Navigator>
  );
}

// ─── Premium Splash Screen ───────────────────────────────
function SplashScreen() {
  const Colors = useColors();
  const { themeMode } = useThemeStore();
  return (
    <View style={[styles.splash, { backgroundColor: Colors.bgScreen }]}>
      <StatusBar barStyle={themeMode === 'dark' ? "light-content" : "dark-content"} />
      <View style={styles.splashLogoContainer}>
        <View style={styles.logoBoxWrapper}>
          <View style={[styles.logoBox, { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary }]}>
            <Text style={[styles.logoText, { color: Colors.primary }]}>MPVP</Text>
          </View>
        </View>
        <Text style={[styles.brandTitle, { color: Colors.textPrimary }]}>FIELD AGENT</Text>
        <Text style={[styles.brandSubtitle, { color: Colors.textMuted }]}>ENTERPRISE VERIFICATION</Text>
      </View>
      <View style={styles.splashFooter}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: Colors.primary }]}>SECURE BOOT...</Text>
      </View>
    </View>
  );
}

// ─── Root Navigator ───────────────────────────────────────
export function AppNavigator() {
  const Colors = useColors();
  const { themeMode } = useThemeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);


  const theme = {
    ... (themeMode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeMode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: Colors.primary,
      background: Colors.bgScreen,
      card: Colors.bgCard,
      text: Colors.textPrimary,
      border: Colors.borderDefault,
      notification: Colors.danger,
    },
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer theme={theme}>
      <StatusBar
        barStyle={themeMode === 'dark' ? "light-content" : "dark-content"}
        backgroundColor={Colors.bgScreen}
      />
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : useAuthStore.getState().user?.is_first_login ? (
          <RootStack.Screen
            name="ForcePasswordChange"
            component={ForcePasswordChangeScreen}
            options={{ gestureEnabled: false }}
          />
        ) : (
          <RootStack.Group>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <RootStack.Screen name="AcceptReject" component={AcceptRejectScreen} />
            <RootStack.Screen name="AssignmentDetail" component={AssignmentDetailScreen} />
            <RootStack.Screen name="InspectionForm" component={InspectionNavigator} />
            <RootStack.Screen name="Requests" component={RequestsScreenWithBoundary} />
            <RootStack.Screen name="Success" component={SuccessScreen as any} />
          </RootStack.Group>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoContainer: {
    alignItems: 'center',
  },
  logoBoxWrapper: {
    marginBottom: 24,
  },
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 12,
    letterSpacing: 2,
  },
});
