import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Animated, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useRequests, OrderNotification } from "@/contexts/RequestsContext";

export function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { notification, clearNotification } = useRequests();
  const translateY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (notification) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [notification]);

  if (!notification) return null;

  const getIcon = (type: OrderNotification["type"]): IconName => {
    switch (type) {
      case "driver_offered":
        return "user";
      case "driver_approved":
        return "check-circle";
      case "driver_rejected":
        return "x-circle";
      case "new_order":
        return "package";
      case "new_message":
        return "message-circle";
      case "payment_accepted":
        return "check-circle";
      case "payment_rejected":
        return "x-circle";
      default:
        return "bell";
    }
  };

  const getBackgroundColor = (type: OrderNotification["type"]) => {
    switch (type) {
      case "driver_offered":
        return theme.secondary;
      case "driver_approved":
        return theme.success;
      case "driver_rejected":
        return theme.error;
      case "new_order":
        return theme.primary;
      case "new_message":
        return theme.primary;
      case "payment_accepted":
        return theme.success;
      case "payment_rejected":
        return theme.error;
      default:
        return theme.primary;
    }
  };

  const isMessageNotification = notification.type === "new_message";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.sm,
          backgroundColor: getBackgroundColor(notification.type),
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={clearNotification}
      >
        {isMessageNotification && notification.senderAvatarUrl ? (
          <Image 
            source={{ uri: notification.senderAvatarUrl }} 
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.iconContainer}>
            <Icon name={getIcon(notification.type)} size={24} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.textContainer}>
          {isMessageNotification && notification.senderName ? (
            <ThemedText style={styles.senderName} numberOfLines={1}>
              {notification.senderName}
            </ThemedText>
          ) : null}
          <ThemedText style={[styles.message, isMessageNotification && styles.messageSmall]} numberOfLines={2}>
            {notification.message}
          </ThemedText>
        </View>
        <Pressable onPress={clearNotification} hitSlop={10}>
          <Icon name="x" size={20} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  textContainer: {
    flex: 1,
  },
  senderName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  message: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  messageSmall: {
    fontSize: 14,
    fontWeight: "500",
  },
});
