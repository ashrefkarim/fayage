import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthScreen from "@/screens/AuthScreen";
import DriverRegistrationScreen from "@/screens/DriverRegistrationScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import ClientTabNavigator from "@/navigation/ClientTabNavigator";
import DriverTabNavigator from "@/navigation/DriverTabNavigator";
import AdminTabNavigator from "@/navigation/AdminTabNavigator";
import CreateRequestScreen from "@/screens/CreateRequestScreen";
import RequestDetailsScreen from "@/screens/RequestDetailsScreen";
import ChatScreen from "@/screens/ChatScreen";
import VerificationScreen from "@/screens/VerificationScreen";
import LiveTrackingScreen from "@/screens/LiveTrackingScreen";
import DeliveryConfirmationScreen from "@/screens/driver/DeliveryConfirmationScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import SupportScreen from "@/screens/SupportScreen";
import EditDocumentsScreen from "@/screens/driver/EditDocumentsScreen";
import FavoriteDriversScreen from "@/screens/client/FavoriteDriversScreen";
import ReferralScreen from "@/screens/ReferralScreen";
import ConversationsScreen from "@/screens/ConversationsScreen";
import VoiceCallScreen from "@/screens/VoiceCallScreen";
import PaymentInstructionsScreen from "@/screens/client/PaymentInstructionsScreen";

export type RootStackParamList = {
  Auth: undefined;
  DriverRegistration: undefined;
  ForgotPassword: undefined;
  ClientMain: undefined;
  DriverMain: undefined;
  AdminMain: undefined;
  CreateRequest: undefined;
  RequestDetails: { requestId: string };
  Chat: { requestId: string; isSupport?: boolean; otherPartyName?: string; pickupAddress?: string; deliveryAddress?: string };
  LiveTracking: { requestId: string };
  DeliveryConfirmation: { requestId: string };
  PaymentInstructions: { orderId: string };
  Verification: undefined;
  EditProfile: undefined;
  Support: undefined;
  EditDocuments: undefined;
  FavoriteDrivers: undefined;
  Referral: undefined;
  Conversations: undefined;
  VoiceCall: {
    channelName: string;
    token: string;
    callerName: string;
    callerId: string;
    requestId: string;
    isIncoming: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const voiceCallScreen = (
  <Stack.Screen
    name="VoiceCall"
    component={VoiceCallScreen}
    options={{ headerShown: false, presentation: "fullScreenModal" }}
  />
);

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DriverRegistration"
            component={DriverRegistrationScreen}
            options={{ headerTitle: t("driverRegistration") }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : user?.role === "driver" ? (
        <>
          <Stack.Screen
            name="DriverMain"
            component={DriverTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="RequestDetails"
            component={RequestDetailsScreen}
            options={{ headerTitle: t("history") }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerTitle: t("chat") }}
          />
          <Stack.Screen
            name="Verification"
            component={VerificationScreen}
            options={{ headerTitle: t("verification") }}
          />
          <Stack.Screen
            name="DeliveryConfirmation"
            component={DeliveryConfirmationScreen}
            options={{ headerTitle: t("confirmDelivery") }}
          />
          <Stack.Screen
            name="PaymentInstructions"
            component={PaymentInstructionsScreen}
            options={{ headerTitle: t("paymentInstructions") }}
          />
          <Stack.Screen
            name="LiveTracking"
            component={LiveTrackingScreen}
            options={{ headerTitle: t("liveTracking") }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerTitle: t("editProfile") }}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={{ headerTitle: t("support") }}
          />
          <Stack.Screen
            name="EditDocuments"
            component={EditDocumentsScreen}
            options={{ headerTitle: t("updateDocuments") }}
          />
          <Stack.Screen
            name="Referral"
            component={ReferralScreen}
            options={{ headerTitle: t("referralProgram") }}
          />
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          {voiceCallScreen}
        </>
      ) : user?.role === "admin" ? (
        <>
          <Stack.Screen
            name="AdminMain"
            component={AdminTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerTitle: t("editProfile") }}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={{ headerTitle: t("support") }}
          />
          {voiceCallScreen}
        </>
      ) : (
        <>
          <Stack.Screen
            name="ClientMain"
            component={ClientTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateRequest"
            component={CreateRequestScreen}
            options={{ headerTitle: t("newTransportRequest") }}
          />
          <Stack.Screen
            name="RequestDetails"
            component={RequestDetailsScreen}
            options={{ headerTitle: t("history") }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerTitle: t("chat") }}
          />
          <Stack.Screen
            name="LiveTracking"
            component={LiveTrackingScreen}
            options={{ headerTitle: t("liveTracking") }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ headerTitle: t("editProfile") }}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={{ headerTitle: t("support") }}
          />
          <Stack.Screen
            name="FavoriteDrivers"
            component={FavoriteDriversScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Referral"
            component={ReferralScreen}
            options={{ headerTitle: t("referralProgram") }}
          />
          <Stack.Screen
            name="Conversations"
            component={ConversationsScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PaymentInstructions"
            component={PaymentInstructionsScreen}
            options={{ headerTitle: t("paymentInstructions") }}
          />
          {voiceCallScreen}
        </>
      )}
    </Stack.Navigator>
  );
}
