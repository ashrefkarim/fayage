import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const MOROCCO_CENTER = { latitude: 33.5731, longitude: -7.5898 };

interface Coords {
  latitude: number;
  longitude: number;
}

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (address: string, coords: Coords) => void;
  initialCoords?: Coords;
  title?: string;
}

export default function MapPickerModal({
  visible,
  onClose,
  onConfirm,
  initialCoords,
  title,
}: MapPickerModalProps) {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [currentCoords, setCurrentCoords] = useState<Coords>(
    initialCoords || MOROCCO_CENTER
  );
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const center = initialCoords || MOROCCO_CENTER;
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      setCurrentCoords(initialCoords || MOROCCO_CENTER);
      setAddress("");
      setMapReady(false);
      readyTimerRef.current = setTimeout(() => setMapReady(true), 2000);
    } else {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    }
    return () => {
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
  }, [visible, initialCoords]);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      let result = "";

      if (GOOGLE_KEY) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}&language=fr`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results[0]) {
          result = data.results[0].formatted_address
            .replace(", Maroc", "")
            .replace(", Morocco", "");
        }
      } else {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`;
        const res = await fetch(url, {
          headers: { "User-Agent": "FAYAGE-App/1.0" },
        });
        const data = await res.json();
        if (data && data.display_name) {
          const parts: string[] = data.display_name
            .split(", ")
            .filter((p: string) => !["Maroc", "Morocco"].includes(p));
          result = parts.slice(0, 4).join(", ");
        }
      }

      if (result) setAddress(result);
    } catch {
      // silent — coords still used as fallback
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const processCoords = useCallback(
    (lat: number, lng: number) => {
      const coords: Coords = { latitude: lat, longitude: lng };
      setCurrentCoords(coords);
      setMapReady(true);
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = setTimeout(() => {
        reverseGeocode(lat, lng);
      }, 700);
    },
    [reverseGeocode]
  );

  // Native WebView onMessage handler
  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (typeof data.lat === "number" && typeof data.lng === "number") {
          processCoords(data.lat, data.lng);
        }
      } catch {
        // silent
      }
    },
    [processCoords]
  );

  // Web fallback: listen for postMessage from the iframe via window events
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (event: MessageEvent) => {
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (typeof data?.lat === "number" && typeof data?.lng === "number") {
          processCoords(data.lat, data.lng);
        }
      } catch {
        // silent
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [processCoords]);

  const handleConfirm = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalAddress =
      address ||
      `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}`;
    onConfirm(finalAddress, currentCoords);
    onClose();
  };

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .leaflet-control-attribution{display:none}
    #pin{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-100%);
      z-index:1000;pointer-events:none;
      transition:transform 0.15s ease;
      filter:drop-shadow(0 6px 8px rgba(0,0,0,0.35));
    }
    #pin-shadow{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,6px);
      width:18px;height:9px;
      background:rgba(0,0,0,0.22);
      border-radius:50%;z-index:999;
      pointer-events:none;
      transition:transform 0.15s ease,opacity 0.15s ease;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="pin">
    <svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 0C10.3 0 0 10.3 0 23c0 17.3 23 35 23 35s23-17.7 23-35C46 10.3 35.7 0 23 0z" fill="#0066CC"/>
      <circle cx="23" cy="23" r="10" fill="white"/>
      <circle cx="23" cy="23" r="6" fill="#0066CC"/>
    </svg>
  </div>
  <div id="pin-shadow"></div>
  <script>
    var pin=document.getElementById('pin');
    var shadow=document.getElementById('pin-shadow');
    var map=L.map('map',{zoomControl:true,attributionControl:false})
      .setView([${center.latitude},${center.longitude}],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

    function sendMsg(payload){
      try{
        if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else {
          window.parent.postMessage(JSON.stringify(payload),'*');
        }
      }catch(e){
        try{ window.parent.postMessage(JSON.stringify(payload),'*'); }catch(_){}
      }
    }

    function sendCenter(){
      var c=map.getCenter();
      sendMsg({lat:c.lat,lng:c.lng});
    }

    map.on('movestart',function(){
      pin.style.transform='translate(-50%,-115%) scale(1.12)';
      shadow.style.transform='translate(-50%,10px) scaleX(0.7)';
      shadow.style.opacity='0.5';
    });
    map.on('moveend',function(){
      pin.style.transform='translate(-50%,-100%)';
      shadow.style.transform='translate(-50%,6px)';
      shadow.style.opacity='1';
      sendCenter();
    });

    // Send initial center once Leaflet tiles are ready
    map.whenReady(function(){ setTimeout(sendCenter,400); });
  </script>
</body>
</html>`;

  // Confirm is enabled once map is ready AND geocoding has finished
  const canConfirm = mapReady && !isGeocoding;
  const displayAddress = address || (mapReady && !isGeocoding
    ? `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}`
    : "");

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Header */}
        <LinearGradient
          colors={[theme.primary, (theme as any).primaryLight || theme.primary + "CC"]}
          style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
        >
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>
            {title || "Choisir un lieu"}
          </ThemedText>
          <View style={{ width: 44 }} />
        </LinearGradient>

        {/* Address bar */}
        <View
          style={[
            styles.addressBar,
            {
              backgroundColor: theme.backgroundDefault,
              shadowColor: "#000",
              borderColor: canConfirm ? theme.primary + "55" : theme.border,
            },
          ]}
        >
          <View style={[styles.addressIcon, { backgroundColor: theme.primary + "18" }]}>
            <Icon name="map-pin" size={17} color={theme.primary} />
          </View>
          {isGeocoding ? (
            <View style={styles.addressContent}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText style={[styles.geocodingText, { color: theme.textSecondary }]}>
                Recherche de l'adresse…
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              style={[
                styles.addressText,
                {
                  color: displayAddress ? theme.text : theme.textSecondary,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              numberOfLines={2}
            >
              {displayAddress || "Déplacez la carte pour choisir un lieu…"}
            </ThemedText>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webviewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={["*"]}
            startInLoadingState
            renderLoading={() => (
              <View
                style={[
                  styles.mapLoading,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText
                  style={{ marginTop: Spacing.md, color: theme.textSecondary }}
                >
                  Chargement de la carte…
                </ThemedText>
              </View>
            )}
          />
        </View>

        {/* Confirm button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.backgroundDefault,
              paddingBottom: insets.bottom + Spacing.md,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                opacity: !canConfirm ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <LinearGradient
              colors={
                canConfirm
                  ? [theme.primary, (theme as any).primaryLight || theme.primary + "CC"]
                  : ["#9CA3AF", "#9CA3AF"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmBtnGradient}
            >
              {isGeocoding ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText style={styles.confirmBtnText}>
                    Recherche de l'adresse…
                  </ThemedText>
                </>
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.confirmBtnText}>
                    {mapReady ? "Confirmer ce lieu" : "Chargement de la carte…"}
                  </ThemedText>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Poppins_600SemiBold",
  },
  addressBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    minHeight: 60,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addressContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  geocodingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  confirmBtn: { borderRadius: BorderRadius.lg, overflow: "hidden" },
  confirmBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 56,
    borderRadius: BorderRadius.lg,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins_700Bold",
  },
});
