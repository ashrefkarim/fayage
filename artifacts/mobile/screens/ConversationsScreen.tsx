import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing, Shadows, Gradients } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  requestId: string;
  orderId: string;
  otherPartyId: string;
  otherPartyName: string;
  otherPartyPhone: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  orderStatus: string;
  pickupAddress: string;
  deliveryAddress: string;
}

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchConversations = useCallback(async (showLoading = true) => {
    if (!user) return;
    
    if (showLoading) setIsLoading(true);
    
    try {
      const url = new URL(`/api/conversations/${user.id}/${user.role}`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchConversations(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    navigation.navigate("Chat", { requestId: conversation.requestId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return theme.warning;
      case "accepted": return theme.primary;
      case "in_transit": return theme.success;
      case "delivered": case "completed": return theme.success;
      case "cancelled": return theme.error;
      default: return theme.textSecondary;
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return t("yesterday");
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
    }
  };

  const renderConversation: ListRenderItem<Conversation> = ({ item }) => (
    <Pressable
      onPress={() => handleConversationPress(item)}
      style={({ pressed }) => [
        styles.conversationCard,
        Shadows.sm,
        {
          backgroundColor: theme.backgroundDefault,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.avatarContainer, { backgroundColor: theme.primary + "15" }]}>
        <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
          {item.otherPartyName.charAt(0).toUpperCase()}
        </ThemedText>
        {item.unreadCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: theme.error }]}>
            <ThemedText style={styles.unreadText}>
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </ThemedText>
          </View>
        ) : null}
      </View>
      
      <View style={[styles.contentContainer, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <ThemedText style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {item.otherPartyName}
          </ThemedText>
          <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
            {formatTime(item.lastMessageAt)}
          </ThemedText>
        </View>
        
        <View style={[styles.statusRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) + "20" }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.orderStatus) }]} />
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.orderStatus) }]}>
              {t(item.orderStatus)}
            </ThemedText>
          </View>
        </View>
        
        <ThemedText 
          style={[
            styles.lastMessage, 
            { 
              color: item.unreadCount > 0 ? theme.text : theme.textSecondary,
              fontWeight: item.unreadCount > 0 ? "600" : "400",
            }
          ]} 
          numberOfLines={1}
        >
          {item.lastMessage || t("noMessages")}
        </ThemedText>
        
        <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="map-pin" size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.pickupAddress.split(",")[0]}
          </ThemedText>
          <Icon name="arrow-right" size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.deliveryAddress.split(",")[0]}
          </ThemedText>
        </View>
      </View>
      
      <Icon name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[theme.primary + "20", theme.secondary + "20"]}
        style={styles.emptyIconContainer}
      >
        <Icon name="message-circle" size={48} color={theme.primary} />
      </LinearGradient>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        {t("noConversations")}
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {t("noConversationsDesc")}
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <LinearGradient
        colors={Gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerHeight + Spacing.md }]}
      >
        <View style={[styles.headerContent, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View>
            <ThemedText style={styles.headerTitle}>{t("messages")}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {conversations.length} {t("conversations")}
            </ThemedText>
          </View>
          <View style={styles.headerIcon}>
            <Icon name="message-circle" size={24} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.requestId}
        renderItem={renderConversation}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.emptyListContent,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius["2xl"],
    borderBottomRightRadius: BorderRadius["2xl"],
  },
  headerContent: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  time: {
    fontSize: 12,
  },
  statusRow: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  lastMessage: {
    fontSize: 14,
  },
  addressRow: {
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  addressText: {
    fontSize: 11,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
});
