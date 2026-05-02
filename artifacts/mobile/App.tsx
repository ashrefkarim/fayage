import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, LogBox } from "react-native";

// Suppress the expo-notifications Expo Go warning (SDK 53 removed Android remote push from Expo Go)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported',
]);
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "@/lib/navigationRef";

// Disable font scaling on Android to prevent zoomed-in appearance
// @ts-ignore
if (Text.defaultProps == null) Text.defaultProps = {};
// @ts-ignore
Text.defaultProps.allowFontScaling = false;
// @ts-ignore
Text.defaultProps.maxFontSizeMultiplier = 1;

// @ts-ignore
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
// @ts-ignore
TextInput.defaultProps.allowFontScaling = false;
// @ts-ignore
TextInput.defaultProps.maxFontSizeMultiplier = 1;
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import MaintenanceScreen from "@/screens/MaintenanceScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationBanner } from "@/components/NotificationBanner";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RequestsProvider } from "@/contexts/RequestsContext";
import { AppSettingsProvider, useAppSettings } from "@/contexts/AppSettingsContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

SplashScreen.preventAutoHideAsync();

function PushNotificationHandler() {
  const { user } = useAuth();
  usePushNotifications({
    userId: user?.id,
    userType: user?.role as "client" | "driver" | undefined,
  });
  return null;
}

function AppContent() {
  const { isMaintenanceMode, maintenanceMessage } = useAppSettings();

  if (isMaintenanceMode) {
    return <MaintenanceScreen message={maintenanceMessage} />;
  }

  return (
    <RequestsProvider>
      <PushNotificationHandler />
      <NavigationContainer ref={navigationRef}>
        <RootStackNavigator />
      </NavigationContainer>
      <NotificationBanner />
    </RequestsProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AppSettingsProvider>
                <LanguageProvider>
                  <AuthProvider>
                    <AppContent />
                    {!splashDone && (
                      <AnimatedSplash onFinish={() => setSplashDone(true)} />
                    )}
                  </AuthProvider>
                </LanguageProvider>
              </AppSettingsProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
