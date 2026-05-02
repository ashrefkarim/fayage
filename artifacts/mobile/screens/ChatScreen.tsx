import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, StyleSheet, FlatList, TextInput, Pressable, ListRenderItem } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type RouteParams = RouteProp<RootStackParamList, "Chat">;

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp?: string;
  createdAt?: string;
  messageType?: string;
  senderRole?: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const { user } = useAuth();

  const isSupport = route.params.isSupport === true;
  const otherPartyName = route.params.otherPartyName ?? (isSupport ? "Support Fayage" : "Correspondant");
  const pickupAddress = route.params.pickupAddress;
  const deliveryAddress = route.params.deliveryAddress;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  /* ── Header title ── */
  useEffect(() => {
    navigation.setOptions({
      headerTitle: isSupport ? "Support Fayage" : otherPartyName,
      headerTitleStyle: { fontWeight: "700" as const },
    });
  }, [isSupport, otherPartyName, navigation]);

  /* ── Fetch history + WebSocket ── */
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const typeParam = isSupport ? "?type=support" : "";
        const url = new URL(`/api/messages/${route.params.requestId}${typeParam}`, getApiUrl());
        const response = await fetch(url.toString());
        const data = await response.json();
        if (data.messages) setMessages(data.messages);
        if (user?.id) {
          const readUrl = new URL(`/api/messages/${route.params.requestId}/read/${user.id}`, getApiUrl());
          await fetch(readUrl.toString(), { method: "POST" });
        }
      } catch {}
    };

    fetchMessages();

    const baseUrl = getApiUrl();
    const wsUrl = baseUrl.replace(/^https?/, "wss").replace(/\/$/, "") + "/ws";
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (user?.id) ws.send(JSON.stringify({ type: "REGISTER_USER", userId: user.id, role: user.role }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const relevantType = isSupport ? "NEW_SUPPORT_MESSAGE" : "NEW_CHAT_MESSAGE";
        if (data.type === relevantType && data.message.requestId === route.params.requestId) {
          setMessages((prev) => {
            const tempIdx = prev.findIndex(
              (m) => m.id.startsWith("temp-") && m.text === data.message.text && m.senderId === data.message.senderId
            );
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = { ...data.message, timestamp: data.message.createdAt };
              return updated;
            }
            return [{ ...data.message, timestamp: data.message.createdAt }, ...prev];
          });
        }
      } catch {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};
    return () => ws.close();
  }, [route.params.requestId, isSupport]);

  /* ── Send ── */
  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    const trimmedText = inputText.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    const optimistic: Message = {
      id: tempId,
      requestId: route.params.requestId,
      senderId: user.id,
      senderName: user.fullName,
      text: trimmedText,
      timestamp: new Date().toISOString(),
      messageType: isSupport ? "support" : "direct",
    };

    setMessages((prev) => [optimistic, ...prev]);
    setInputText("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "CHAT_MESSAGE",
        requestId: route.params.requestId,
        senderId: user.id,
        senderName: user.fullName,
        senderType: user.role,
        senderProfilePicture: user.avatarUrl || null,
        text: trimmedText,
        messageType: isSupport ? "support" : "direct",
      }));
    } else {
      try {
        const url = new URL("/api/messages", getApiUrl());
        await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: route.params.requestId,
            senderId: user.id,
            senderName: user.fullName,
            senderType: user.role,
            text: trimmedText,
            messageType: isSupport ? "support" : "direct",
          }),
        });
      } catch {}
    }
  };

  /* ── Message bubble ── */
  const renderMessage: ListRenderItem<Message> = ({ item, index }) => {
    const isMe = item.senderId === user?.id;
    const isAdmin = item.senderRole === "admin" || item.senderId === "admin";
    const isTemp = item.id.startsWith("temp-");

    const displayName = isAdmin ? "Support Fayage" : item.senderName;

    // Grouping: don't repeat name if same sender as next message (inverted list → item at index 0 is newest)
    const prevItem = messages[index + 1];
    const showName = !isMe && (!prevItem || prevItem.senderId !== item.senderId);

    const bubbleBg = isMe
      ? (isSupport ? theme.primary : "#10B981")
      : isAdmin
        ? theme.primary + "15"
        : theme.backgroundSecondary;

    return (
      <View style={[styles.msgWrap, { alignItems: isMe ? "flex-end" : "flex-start" }]}>
        {showName ? (
          <View style={[styles.senderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {isAdmin ? (
              <View style={[styles.adminDot, { backgroundColor: theme.primary + "25" }]}>
                <Icon name="headphones" size={9} color={theme.primary} />
              </View>
            ) : (
              <View style={[styles.roleDot, { backgroundColor: isMe ? "#10B98125" : theme.backgroundSecondary }]}>
                <Icon name={item.senderRole === "driver" ? "truck" : "user"} size={9} color={theme.textSecondary} />
              </View>
            )}
            <ThemedText style={[styles.senderName, { color: theme.textSecondary }]}>{displayName}</ThemedText>
          </View>
        ) : null}

        <View style={[
          styles.bubble,
          {
            backgroundColor: bubbleBg,
            borderBottomRightRadius: isMe ? 4 : BorderRadius.lg,
            borderBottomLeftRadius: isMe ? BorderRadius.lg : 4,
            borderWidth: isAdmin && !isMe ? 1 : 0,
            borderColor: theme.primary + "30",
          },
        ]}>
          <ThemedText style={[
            styles.bubbleText,
            { color: isMe ? "#FFFFFF" : isAdmin ? theme.primary : theme.text },
          ]}>
            {item.text}
          </ThemedText>
        </View>

        <View style={[styles.metaRow, { flexDirection: isMe ? (isRTL ? "row" : "row-reverse") : "row" }]}>
          <ThemedText style={[styles.ts, { color: theme.textSecondary }]}>
            {new Date(item.timestamp || item.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </ThemedText>
          {isMe ? (
            <Icon name={isTemp ? "check" : "check-check"} size={13} color={isTemp ? theme.textSecondary : "#10B981"} />
          ) : null}
        </View>
      </View>
    );
  };

  /* ── Empty state ── */
  const renderEmpty = () => (
    <View style={styles.empty}>
      <View style={[styles.emptyIconBg, { backgroundColor: (isSupport ? theme.primary : "#10B981") + "15" }]}>
        <Icon name={isSupport ? "headphones" : "message-circle"} size={36} color={isSupport ? theme.primary : "#10B981"} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        {isSupport ? "Chat avec le Support" : `Démarrer une conversation`}
      </ThemedText>
      <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
        {isSupport
          ? "Notre équipe vous répondra dans les plus brefs délais."
          : `Envoyez un message à ${otherPartyName}.`}
      </ThemedText>
    </View>
  );

  const accentColor = isSupport ? theme.primary : "#10B981";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      {/* ── Context banner ── */}
      {isSupport ? (
        <View style={[styles.supportBanner, { backgroundColor: theme.primary + "10", borderBottomColor: theme.primary + "20" }]}>
          <Icon name="shield" size={13} color={theme.primary} />
          <ThemedText style={[styles.bannerText, { color: theme.primary }]}>
            Ce chat est sécurisé et surveillé par notre équipe
          </ThemedText>
        </View>
      ) : pickupAddress && deliveryAddress ? (
        <LinearGradient
          colors={["#064E3B", "#065F46"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.routeBanner}
        >
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, { backgroundColor: "#6EE7B7" }]} />
            <ThemedText style={styles.routeAddr} numberOfLines={1}>{pickupAddress}</ThemedText>
          </View>
          <View style={styles.routeArrow}>
            <Icon name="arrow-right" size={14} color="rgba(255,255,255,0.4)" />
          </View>
          <View style={styles.routeItem}>
            <View style={[styles.routeDot, { backgroundColor: "#FCA5A5" }]} />
            <ThemedText style={styles.routeAddr} numberOfLines={1}>{deliveryAddress}</ThemedText>
          </View>
        </LinearGradient>
      ) : null}

      {/* ── Message list ── */}
      <FlatList
        ref={flatListRef}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listEmpty,
        ]}
        inverted={messages.length > 0}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Input bar ── */}
      <View style={[
        styles.inputBar,
        {
          backgroundColor: theme.backgroundDefault,
          paddingBottom: insets.bottom + Spacing.sm,
          borderTopColor: theme.border + "40",
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}>
        <View style={[
          styles.inputWrap,
          { backgroundColor: theme.backgroundSecondary, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}>
          <TextInput
            style={[styles.input, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
            placeholder={isSupport ? "Écrivez au support..." : `Message à ${otherPartyName}...`}
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
        </View>
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: inputText.trim() ? accentColor : theme.border, opacity: pressed && inputText.trim() ? 0.8 : 1 },
          ]}
        >
          <Icon name="send" size={20} color="#FFFFFF" style={{ transform: [{ rotate: isRTL ? "180deg" : "0deg" }] }} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Banners */
  supportBanner: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, fontWeight: "500", flex: 1 },
  routeBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingVertical: 10, gap: Spacing.sm },
  routeItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  routeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  routeAddr: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "500", flex: 1 },
  routeArrow: { flexShrink: 0 },

  /* Messages */
  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  listEmpty: { flexGrow: 1, justifyContent: "center" },

  msgWrap: { marginBottom: Spacing.sm, maxWidth: "82%" },
  senderRow: { alignItems: "center", gap: 4, marginBottom: 3, paddingHorizontal: 2 },
  adminDot: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  roleDot: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  senderName: { fontSize: 11, fontWeight: "600" },
  bubble: { padding: Spacing.md, borderRadius: BorderRadius.lg },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  metaRow: { alignItems: "center", gap: 4, marginTop: 3, paddingHorizontal: 2 },
  ts: { fontSize: 11 },

  /* Empty */
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md, paddingVertical: Spacing["5xl"] },
  emptyIconBg: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: Spacing["2xl"] },

  /* Input */
  inputBar: { padding: Spacing.md, gap: Spacing.sm, borderTopWidth: 1, alignItems: "flex-end" },
  inputWrap: { flex: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, maxHeight: 100 },
  input: { flex: 1, fontSize: 15, paddingVertical: Spacing.xs },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
