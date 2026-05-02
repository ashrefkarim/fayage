import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";
import { Spacing } from "@/constants/theme";

type RouteParams = RouteProp<RootStackParamList, "VoiceCall">;

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || "";

export default function VoiceCallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();

  const { channelName, token, callerName, callerId, requestId, isIncoming } =
    route.params;

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [callStatus, setCallStatus] = useState<
    "connecting" | "ringing" | "active" | "ended"
  >(isIncoming ? "ringing" : "connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const endCallAndGoBack = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      localTrackRef.current?.stop();
      localTrackRef.current?.close();
    } catch {}
    try {
      clientRef.current?.leave();
    } catch {}
    clientRef.current = null;
    localTrackRef.current = null;
    try {
      wsRef.current?.close();
    } catch {}
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const initEngine = useCallback(async () => {
    if (!APP_ID) {
      console.error("Agora APP_ID not set");
      endCallAndGoBack();
      return;
    }

    try {
      AgoraRTC.setLogLevel(4);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (remoteUser: IAgoraRTCRemoteUser, mediaType: string) => {
        await client.subscribe(remoteUser, mediaType as any);
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
          setCallStatus("active");
          timerRef.current = setInterval(() => {
            setCallDuration((d) => d + 1);
          }, 1000);
        }
      });

      client.on("user-unpublished", (remoteUser: IAgoraRTCRemoteUser) => {
        endCallAndGoBack();
      });

      client.on("user-left", () => {
        endCallAndGoBack();
      });

      await client.join(APP_ID, channelName, token, null);

      const localTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTrackRef.current = localTrack;
      await client.publish([localTrack]);

      if (!isIncoming) {
        setCallStatus("ringing");
      }
    } catch (e) {
      console.error("Agora Web engine error:", e);
      endCallAndGoBack();
    }
  }, [token, channelName, isIncoming, endCallAndGoBack]);

  const connectSignaling = useCallback(() => {
    try {
      const baseUrl = getApiUrl();
      const wsUrl =
        baseUrl.replace(/^https?/, "wss").replace(/\/$/, "") + "/ws";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (user?.id) {
          ws.send(
            JSON.stringify({
              type: "REGISTER_USER",
              userId: user.id,
              role: user.role,
            })
          );
        }
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "CALL_ACCEPTED" && data.channelName === channelName) {
            setCallStatus("active");
          }
          if (data.type === "CALL_ENDED" && data.channelName === channelName) {
            endCallAndGoBack();
          }
          if (data.type === "CALL_REJECTED" && data.channelName === channelName) {
            endCallAndGoBack();
          }
        } catch {}
      };

      ws.onerror = () => {};
      ws.onclose = () => {};
    } catch (e) {
      console.error("WS signaling error:", e);
    }
  }, [user, channelName, endCallAndGoBack]);

  useEffect(() => {
    connectSignaling();
    if (!isIncoming) {
      initEngine();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { localTrackRef.current?.stop(); localTrackRef.current?.close(); } catch {}
      try { clientRef.current?.leave(); } catch {}
      try { wsRef.current?.close(); } catch {}
    };
  }, []);

  const handleAccept = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wsRef.current?.send(
      JSON.stringify({
        type: "CALL_ACCEPTED",
        channelName,
        callerId,
        calleeId: user?.id,
        requestId,
      })
    );
    setCallStatus("connecting");
    await initEngine();
  }, [channelName, callerId, user?.id, requestId, initEngine]);

  const handleDecline = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    wsRef.current?.send(
      JSON.stringify({
        type: "CALL_REJECTED",
        channelName,
        callerId,
        calleeId: user?.id,
        requestId,
      })
    );
    endCallAndGoBack();
  }, [channelName, callerId, user?.id, requestId, endCallAndGoBack]);

  const handleEndCall = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    wsRef.current?.send(
      JSON.stringify({
        type: "CALL_ENDED",
        channelName,
        callerId: user?.id,
        requestId,
      })
    );
    endCallAndGoBack();
  }, [channelName, user?.id, requestId, endCallAndGoBack]);

  const handleToggleMute = useCallback(async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      if (newMuted) {
        await localTrackRef.current?.setMuted(true);
      } else {
        await localTrackRef.current?.setMuted(false);
      }
    } catch {}
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isMuted]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const statusLabel = () => {
    switch (callStatus) {
      case "connecting": return t("callConnecting");
      case "ringing": return isIncoming ? t("callIncoming") : t("callRinging");
      case "active": return formatDuration(callDuration);
      case "ended": return t("callEnded");
    }
  };

  return (
    <LinearGradient
      colors={["#0066CC", "#004499", "#002266"]}
      style={[
        styles.container,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      {/* Caller info */}
      <View style={styles.callerSection}>
        <View style={styles.avatarRing}>
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <ThemedText style={styles.avatarInitials}>
              {callerName ? callerName.charAt(0).toUpperCase() : "?"}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.callerName}>{callerName}</ThemedText>
        <ThemedText style={styles.callStatus}>{statusLabel()}</ThemedText>
      </View>

      {/* Controls */}
      {callStatus === "ringing" && isIncoming ? (
        <View style={styles.incomingActions}>
          <View style={styles.incomingActionItem}>
            <Pressable onPress={handleDecline} style={[styles.incomingBtn, styles.declineBtn]}>
              <Icon name="phone-off" size={28} color="#FFFFFF" />
            </Pressable>
            <ThemedText style={styles.actionLabel}>{t("decline")}</ThemedText>
          </View>
          <View style={styles.incomingActionItem}>
            <Pressable onPress={handleAccept} style={[styles.incomingBtn, styles.acceptBtn]}>
              <Icon name="phone-call" size={28} color="#FFFFFF" />
            </Pressable>
            <ThemedText style={styles.actionLabel}>{t("accept")}</ThemedText>
          </View>
        </View>
      ) : (
        <View style={styles.activeControls}>
          <View style={styles.controlsRow}>
            {/* Mute */}
            <View style={styles.controlItem}>
              <Pressable
                onPress={handleToggleMute}
                style={[
                  styles.controlBtn,
                  { backgroundColor: isMuted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)" },
                ]}
              >
                <Icon name={isMuted ? "mic-off" : "mic"} size={26} color="#FFFFFF" />
              </Pressable>
              <ThemedText style={styles.controlLabel}>
                {isMuted ? t("unmute") : t("mute")}
              </ThemedText>
            </View>

            {/* End call */}
            <View style={styles.controlItem}>
              <Pressable onPress={handleEndCall} style={[styles.controlBtn, styles.endBtn]}>
                <Icon name="phone-off" size={28} color="#FFFFFF" />
              </Pressable>
              <ThemedText style={styles.controlLabel}>{t("endCall")}</ThemedText>
            </View>

            {/* Speaker (web has no earpiece toggle but we keep UI consistent) */}
            <View style={styles.controlItem}>
              <Pressable
                style={[styles.controlBtn, { backgroundColor: "rgba(255,255,255,0.12)", opacity: 0.4 }]}
              >
                <Icon name="volume-2" size={26} color="#FFFFFF" />
              </Pressable>
              <ThemedText style={styles.controlLabel}>{t("speaker")}</ThemedText>
            </View>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between", paddingHorizontal: Spacing.xl },
  callerSection: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  avatarRing: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#FFFFFF", fontSize: 48, fontWeight: "800" },
  callerName: { color: "#FFFFFF", fontSize: 28, fontWeight: "700", textAlign: "center" },
  callStatus: { color: "rgba(255,255,255,0.75)", fontSize: 16, textAlign: "center" },
  incomingActions: { flexDirection: "row", justifyContent: "space-around", paddingBottom: Spacing["3xl"] },
  incomingActionItem: { alignItems: "center", gap: Spacing.sm },
  incomingBtn: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  acceptBtn: { backgroundColor: "#16A34A" },
  declineBtn: { backgroundColor: "#DC2626" },
  actionLabel: { color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" },
  activeControls: { paddingBottom: Spacing["3xl"] },
  controlsRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  controlItem: { alignItems: "center", gap: Spacing.sm },
  controlBtn: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  endBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#DC2626" },
  controlLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
});
