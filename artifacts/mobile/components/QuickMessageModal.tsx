import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

/* ─── Types ─── */

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: string;
  text: string;
  createdAt: string;
}

interface QuickMsg {
  text: string;
  icon: string;
}

interface QuickCategory {
  label: string;
  color: string;
  messages: QuickMsg[];
}

/* ─── Preset messages ─── */

const DRIVER_CATEGORIES: QuickCategory[] = [
  {
    label: "Ma position",
    color: "#3B82F6",
    messages: [
      { icon: "navigation", text: "Je suis en route" },
      { icon: "clock", text: "J'arrive dans 5 minutes" },
      { icon: "map-pin", text: "Je suis arrivé au dépôt" },
      { icon: "map-pin", text: "Je suis à destination" },
    ],
  },
  {
    label: "Accès",
    color: "#F59E0B",
    messages: [
      { icon: "home", text: "Je vous attends à l'entrée" },
      { icon: "key", text: "Pouvez-vous m'ouvrir ?" },
      { icon: "alert-circle", text: "Je suis bloqué au portail" },
    ],
  },
  {
    label: "Chargement",
    color: "#8B5CF6",
    messages: [
      { icon: "package", text: "Je commence le chargement" },
      { icon: "check-circle", text: "Chargement terminé, je pars" },
      { icon: "help-circle", text: "Où est la sortie camions ?" },
    ],
  },
  {
    label: "Livraison",
    color: "#10B981",
    messages: [
      { icon: "check-circle", text: "La livraison est effectuée" },
      { icon: "phone", text: "Appelez-moi à la réception" },
    ],
  },
];

const CLIENT_CATEGORIES: QuickCategory[] = [
  {
    label: "Ma position",
    color: "#3B82F6",
    messages: [
      { icon: "map-pin", text: "Je suis au dépôt" },
      { icon: "clock", text: "J'arrive dans 10 minutes" },
      { icon: "check-circle", text: "Je suis là, venez" },
    ],
  },
  {
    label: "Marchandise",
    color: "#F59E0B",
    messages: [
      { icon: "package", text: "La marchandise est prête" },
      { icon: "clock", text: "Pouvez-vous attendre 5 min ?" },
      { icon: "users", text: "Aidez pour le chargement svp" },
    ],
  },
  {
    label: "Accès",
    color: "#8B5CF6",
    messages: [
      { icon: "home", text: "Entrée principale" },
      { icon: "key", text: "Portail côté rue" },
      { icon: "phone", text: "Appelez à votre arrivée" },
    ],
  },
  {
    label: "Confirmation",
    color: "#10B981",
    messages: [
      { icon: "thumbs-up", text: "Tout est bon, merci !" },
      { icon: "star", text: "Merci pour la livraison" },
    ],
  },
];

/* ─── Helpers ─── */

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Props ─── */

interface QuickMessageModalProps {
  visible: boolean;
  requestId: string;
  otherPartyName: string;
  onClose: () => void;
  onSent?: () => void;
}

/* ─── Component ─── */

export default function QuickMessageModal({
  visible,
  requestId,
  otherPartyName,
  onClose,
  onSent,
}: QuickMessageModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  const flatRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const categories = user?.role === "driver" ? DRIVER_CATEGORIES : CLIENT_CATEGORIES;

  /* ── Load messages ── */
  const loadMessages = useCallback(async () => {
    if (!requestId) return;
    try {
      const url = new URL(`/api/messages/${requestId}`, getApiUrl());
      url.searchParams.set("type", "direct");
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : (data.messages ?? []));
      }
    } catch {
      // silent
    }
  }, [requestId]);

  /* ── On open/close ── */
  useEffect(() => {
    if (visible) {
      setLoadingMsgs(true);
      loadMessages().finally(() => setLoadingMsgs(false));
      pollRef.current = setInterval(loadMessages, 8000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setMessages([]);
      setJustSent(null);
      setSending(null);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible, loadMessages]);

  /* ── Auto-scroll to bottom when messages change ── */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  /* ── Send ── */
  const handleSend = async (text: string) => {
    if (sending || !user) return;

    setSending(text);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const url = new URL("/api/messages", getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          senderId: user.id,
          senderName: user.fullName,
          senderType: user.role,
          text,
          messageType: "direct",
        }),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustSent(text);
      onSent?.();
      await loadMessages();

      setTimeout(() => setJustSent(null), 2000);
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSending(null);
    }
  };

  /* ── Render a message bubble ── */
  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}>
        {!isMine && (
          <View style={[styles.avatar, { backgroundColor: "#064E3B" }]}>
            <Icon
              name={item.senderType === "driver" ? "truck" : "user"}
              size={12}
              color="#6EE7B7"
            />
          </View>
        )}
        <View style={{ maxWidth: "72%", gap: 3 }}>
          {!isMine && (
            <ThemedText style={[styles.senderLabel, { color: theme.textSecondary }]}>
              {item.senderName}
            </ThemedText>
          )}
          <View
            style={[
              styles.bubble,
              isMine
                ? { backgroundColor: "#064E3B" }
                : { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[
                styles.bubbleText,
                { color: isMine ? "#FFFFFF" : theme.text },
              ]}
            >
              {item.text}
            </ThemedText>
          </View>
          <ThemedText style={[styles.timeLabel, { color: theme.textSecondary, alignSelf: isMine ? "flex-end" : "flex-start" }]}>
            {formatTime(item.createdAt)}
          </ThemedText>
        </View>
        {isMine && (
          <View style={[styles.avatar, { backgroundColor: "#064E3B22" }]}>
            <Icon
              name={user?.role === "driver" ? "truck" : "user"}
              size={12}
              color="#064E3B"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose} />

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.sm },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
        </View>

        {/* Header */}
        <LinearGradient
          colors={["#064E3B", "#065F46"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerIcon}>
            <Icon name="message-circle" size={18} color="#6EE7B7" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>{otherPartyName}</ThemedText>
            <ThemedText style={styles.headerSub}>Messages rapides</ThemedText>
          </View>
          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
          >
            <Icon name="x" size={18} color="#FFFFFF" />
          </Pressable>
        </LinearGradient>

        {/* ── Conversation thread ── */}
        <View style={[styles.thread, { backgroundColor: theme.backgroundSecondary + "55" }]}>
          {loadingMsgs ? (
            <View style={styles.threadEmpty}>
              <ActivityIndicator size="small" color="#064E3B" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.threadEmpty}>
              <Icon name="message-circle" size={24} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                Aucun message pour l'instant
              </ThemedText>
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.threadContent}
              showsVerticalScrollIndicator={false}
            />
          )}
          {/* "just sent" flash */}
          {justSent && (
            <View style={styles.sentFlash}>
              <Icon name="check-circle" size={14} color="#10B981" />
              <ThemedText style={styles.sentFlashText}>Envoyé</ThemedText>
            </View>
          )}
        </View>

        {/* ── Quick message chips ── */}
        <ScrollView
          horizontal={false}
          showsVerticalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {categories.map((cat) => (
            <View key={cat.label} style={styles.catRow}>
              {/* Category pill label */}
              <View style={[styles.catPill, { backgroundColor: cat.color + "18" }]}>
                <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                <ThemedText style={[styles.catLabel, { color: cat.color }]}>
                  {cat.label}
                </ThemedText>
              </View>

              {/* Horizontal scrolling chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {cat.messages.map((msg) => {
                  const isThisSending = sending === msg.text;
                  const isJustSent = justSent === msg.text;
                  return (
                    <Pressable
                      key={msg.text}
                      onPress={() => handleSend(msg.text)}
                      disabled={!!sending}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isJustSent
                            ? "#10B98120"
                            : isThisSending
                            ? cat.color + "20"
                            : theme.backgroundSecondary,
                          borderColor: isJustSent
                            ? "#10B981"
                            : isThisSending
                            ? cat.color
                            : theme.border,
                          borderWidth: 1.5,
                          opacity: pressed ? 0.75 : sending && !isThisSending ? 0.45 : 1,
                        },
                      ]}
                    >
                      {isThisSending ? (
                        <ActivityIndicator size="small" color={cat.color} />
                      ) : isJustSent ? (
                        <Icon name="check" size={13} color="#10B981" />
                      ) : (
                        <Icon name={msg.icon as any} size={13} color={cat.color} />
                      )}
                      <ThemedText
                        style={[
                          styles.chipText,
                          { color: isJustSent ? "#10B981" : theme.text },
                        ]}
                      >
                        {msg.text}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Thread */
  thread: {
    height: 180,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  threadEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 13,
  },
  threadContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  msgRowRight: {
    justifyContent: "flex-end",
  },
  msgRowLeft: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 2,
  },
  bubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeLabel: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  sentFlash: {
    position: "absolute",
    bottom: Spacing.sm,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B98118",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sentFlashText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },

  /* Chips */
  chipsScroll: {
    maxHeight: 280,
  },
  chipsContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  catRow: {
    gap: Spacing.sm,
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipsRow: {
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.md,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
