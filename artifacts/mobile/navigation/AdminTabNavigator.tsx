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
import AdminVerificationScreen from "@/screens/admin/AdminVerificationScreen";
import AdminOrdersScreen from "@/screens/admin/AdminOrdersScreen";
import AdminAnnouncementsScreen from "@/screens/admin/AdminAnnouncementsScreen";
import AdminPaymentsScreen from "@/screens/admin/AdminPaymentsScreen";
import ProfileScreen from "@/screens/ProfileScreen";

export type AdminTabParamList = {
  OrdersTab: undefined;
  PaymentsTab: undefined;
  AnnouncementsTab: undefined;
  VerificationTab: undefined;
  ProfileTab: undefined;
};

export type OrdersStackParamList = {
  Orders: undefined;
};

export type PaymentsStackParamList = {
  Payments: undefined;
};

export type AnnouncementsStackParamList = {
  Announcements: undefined;
};

export type VerificationStackParamList = {
  Verification: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const PaymentsStack = createNativeStackNavigator<PaymentsStackParamList>();
const AnnouncementsStack = createNativeStackNavigator<AnnouncementsStackParamList>();
const VerificationStack = createNativeStackNavigator<VerificationStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function OrdersStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <OrdersStack.Navigator screenOptions={screenOptions}>
      <OrdersStack.Screen
        name="Orders"
        component={AdminOrdersScreen}
        options={{
          headerTitle: t("orderManagement") || "Gestion des commandes",
        }}
      />
    </OrdersStack.Navigator>
  );
}

function PaymentsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <PaymentsStack.Navigator screenOptions={screenOptions}>
      <PaymentsStack.Screen
        name="Payments"
        component={AdminPaymentsScreen}
        options={{ headerTitle: t("paymentsManagement") || "Gestion des paiements" }}
      />
    </PaymentsStack.Navigator>
  );
}

function AnnouncementsStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <AnnouncementsStack.Navigator screenOptions={screenOptions}>
      <AnnouncementsStack.Screen
        name="Announcements"
        component={AdminAnnouncementsScreen}
        options={{
          headerTitle: t("announcements") || "Annonces",
        }}
      />
    </AnnouncementsStack.Navigator>
  );
}

function VerificationStackNavigator() {
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  return (
    <VerificationStack.Navigator screenOptions={screenOptions}>
      <VerificationStack.Screen
        name="Verification"
        component={AdminVerificationScreen}
        options={{
          headerTitle: () => <HeaderTitle title="FAYAGE Admin" />,
        }}
      />
    </VerificationStack.Navigator>
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

export default function AdminTabNavigator() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      initialRouteName="OrdersTab"
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
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{
          title: t("orders") || "Commandes",
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PaymentsTab"
        component={PaymentsStackNavigator}
        options={{
          title: t("payments") || "Paiements",
          tabBarIcon: ({ color, size }) => (
            <Icon name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AnnouncementsTab"
        component={AnnouncementsStackNavigator}
        options={{
          title: t("announcements") || "Annonces",
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="VerificationTab"
        component={VerificationStackNavigator}
        options={{
          title: t("driverVerification"),
          tabBarIcon: ({ color, size }) => (
            <Icon name="check-circle" size={size} color={color} />
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
