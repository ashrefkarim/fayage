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
import ClientHomeScreen from "@/screens/client/ClientHomeScreen";
import ClientTrackScreen from "@/screens/client/ClientTrackScreen";
import ClientHistoryScreen from "@/screens/client/ClientHistoryScreen";
import ProfileScreen from "@/screens/ProfileScreen";

export type ClientTabParamList = {
  HomeTab: undefined;
  TrackTab: undefined;
  HistoryTab: undefined;
  ProfileTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
};

export type TrackStackParamList = {
  Track: undefined;
};

export type HistoryStackParamList = {
  History: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator<ClientTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const TrackStack = createNativeStackNavigator<TrackStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function HomeStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        name="Home"
        component={ClientHomeScreen}
        options={{
          headerTitle: () => <HeaderTitle title="FAYAGE" />,
        }}
      />
    </HomeStack.Navigator>
  );
}

function TrackStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <TrackStack.Navigator screenOptions={screenOptions}>
      <TrackStack.Screen
        name="Track"
        component={ClientTrackScreen}
        options={{ headerTitle: t("track") }}
      />
    </TrackStack.Navigator>
  );
}

function HistoryStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen
        name="History"
        component={ClientHistoryScreen}
        options={{ headerTitle: t("history") }}
      />
    </HistoryStack.Navigator>
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

export default function ClientTabNavigator() {
  const { theme, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
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
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: t("home"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TrackTab"
        component={TrackStackNavigator}
        options={{
          title: t("track"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-pin" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStackNavigator}
        options={{
          title: t("history"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="clock" size={size} color={color} />
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
