import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getApiUrl } from '@/lib/query-client';

// Detect Expo Go — SDK 53 removed Android push notification support from Expo Go
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

// Only import and configure notifications on native platforms outside of Expo Go
let Notifications: any = null;
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    Notifications = null;
  }
}

interface UsePushNotificationsProps {
  userId?: string;
  userType?: 'client' | 'driver';
}

type NotificationSubscription = any;

export function usePushNotifications({ userId, userType }: UsePushNotificationsProps) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<any>(null);
  const notificationListener = useRef<NotificationSubscription | undefined>(undefined);
  const responseListener = useRef<NotificationSubscription | undefined>(undefined);

  async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    // Skip on web platform
    if (Platform.OS === 'web' || !Notifications) {
      return undefined;
    }

    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return undefined;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
    } catch (error: any) {
      if (error?.message?.includes('projectId') || error?.message?.includes('Expo Go')) {
        console.log('Push notifications require a development build - skipping in Expo Go');
      } else {
        console.log('Push notification setup skipped:', error?.message || 'Unknown error');
      }
      return undefined;
    }

    return token;
  }

  async function savePushTokenToServer(token: string) {
    if (!userId || !userType) return;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/push-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userType,
          token,
          platform: Platform.OS,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save push token to server');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  useEffect(() => {
    if (!userId || !userType) return;
    
    // Skip on web platform
    if (Platform.OS === 'web' || !Notifications) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        savePushTokenToServer(token);
      }
    });

    if (typeof Notifications.addNotificationReceivedListener === 'function') {
      notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
        setNotification(notification);
      });
    }

    if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        console.log('Notification response:', data);
      });
    }

    return () => {
      if (notificationListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current && typeof Notifications.removeNotificationSubscription === 'function') {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [userId, userType]);

  return {
    expoPushToken,
    notification,
  };
}
