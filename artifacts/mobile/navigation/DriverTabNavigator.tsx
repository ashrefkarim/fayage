import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useDriverLocationTracking } from "@/hooks/useDriverLocationTracking";
import DriverJobsScreen from "@/screens/driver/DriverJobsScreen";
import DriverActiveScreen from "@/screens/driver/DriverActiveScreen";
import DriverEarningsScreen from "@/screens/driver/DriverEarningsScreen";
import DriverWalletScreen from "@/screens/driver/DriverWalletScreen";
import ProfileScreen from "@/screens/ProfileScreen";

export type DriverTabParamList = {
  JobsTab: undefined;
  ActiveTab: undefined;
  EarningsTab: undefined;
  WalletTab: undefined;
  ProfileTab: undefined;
};

export type JobsStackParamList = {
  Jobs: undefined;
};

export type ActiveStackParamList = {
  Active: undefined;
};

export type EarningsStackParamList = {
  Earnings: undefined;
};

export type WalletStackParamList = {
  Wallet: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();
const JobsStack = createNativeStackNavigator<JobsStackParamList>();
const ActiveStack = createNativeStackNavigator<ActiveStackParamList>();
const EarningsStack = createNativeStackNavigator<EarningsStackParamList>();
const WalletStack = createNativeStackNavigator<WalletStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function JobsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <JobsStack.Navigator screenOptions={screenOptions}>
      <JobsStack.Screen
        name="Jobs"
        component={DriverJobsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="FAYAGE" />,
        }}
      />
    </JobsStack.Navigator>
  );
}

function ActiveStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <ActiveStack.Navigator screenOptions={screenOptions}>
      <ActiveStack.Screen
        name="Active"
        component={DriverActiveScreen}
        options={{ headerTitle: t("active") }}
      />
    </ActiveStack.Navigator>
  );
}

function EarningsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <EarningsStack.Navigator screenOptions={screenOptions}>
      <EarningsStack.Screen
        name="Earnings"
        component={DriverEarningsScreen}
        options={{ headerTitle: t("earnings") }}
      />
    </EarningsStack.Navigator>
  );
}

function WalletStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <WalletStack.Navigator screenOptions={screenOptions}>
      <WalletStack.Screen
        name="Wallet"
        component={DriverWalletScreen}
        options={{ headerTitle: t("wallet") }}
      />
    </WalletStack.Navigator>
  );
}

function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: t("profile") }}
      />
    </ProfileStack.Navigator>
  );
}

export default function DriverTabNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  useDriverLocationTracking({ enabled: true, updateInterval: 15000 });

  return (
    <Tab.Navigator
      initialRouteName="JobsTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="JobsTab"
        component={JobsStackNavigator}
        options={{
          title: t("jobs"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ActiveTab"
        component={ActiveStackNavigator}
        options={{
          title: t("active"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="truck" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="EarningsTab"
        component={EarningsStackNavigator}
        options={{
          title: t("earnings"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WalletTab"
        component={WalletStackNavigator}
        options={{
          title: t("withdrawal"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: t("profile"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
