import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  info: { bg: "#DBEAFE", text: "#1E40AF", icon: "#3B82F6" },
  warning: { bg: "#FEF3C7", text: "#92400E", icon: "#F59E0B" },
  urgent: { bg: "#FEE2E2", text: "#991B1B", icon: "#EF4444" },
};

interface AnnouncementBannerProps {
  audience: "clients" | "drivers";
}

export function AnnouncementBanner({ audience }: AnnouncementBannerProps) {
  const { theme } = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [fadeAnim] = useState(new Animated.Value(1));

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await fetch(new URL(`api/announcements/active?audience=${audience}`, getApiUrl()).toString());
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.announcements || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  }, [audience]);

  useEffect(() => {
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));

  const dismissCurrent = () => {
    if (visibleAnnouncements.length === 0) return;
    
    const currentAnnouncement = visibleAnnouncements[currentIndex];
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDismissedIds(prev => new Set([...prev, currentAnnouncement.id]));
      setCurrentIndex(0);
      fadeAnim.setValue(1);
    });
  };

  const goToNext = () => {
    if (visibleAnnouncements.length <= 1) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleAnnouncements.length);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const currentAnnouncement = visibleAnnouncements[currentIndex];
  const colors = TYPE_COLORS[currentAnnouncement.type] || TYPE_COLORS.info;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: colors.bg, opacity: fadeAnim }
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon 
            name={currentAnnouncement.type === "urgent" ? "alert-circle" : currentAnnouncement.type === "warning" ? "alert-circle" : "info"} 
            size={20} 
            color={colors.icon} 
          />
        </View>
        <Pressable style={styles.textContainer} onPress={goToNext}>
          <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {currentAnnouncement.title}
          </ThemedText>
          <ThemedText style={[styles.message, { color: colors.text }]} numberOfLines={2}>
            {currentAnnouncement.message}
          </ThemedText>
          {visibleAnnouncements.length > 1 ? (
            <ThemedText style={[styles.counter, { color: colors.text }]}>
              {currentIndex + 1} / {visibleAnnouncements.length}
            </ThemedText>
          ) : null}
        </Pressable>
        <Pressable style={styles.closeButton} onPress={dismissCurrent}>
          <Icon name="x" size={18} color={colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
  },
  iconContainer: {
    marginRight: Spacing.sm,
    paddingTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  counter: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
});
