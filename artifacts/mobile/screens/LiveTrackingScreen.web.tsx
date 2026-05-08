import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRequests } from "@/contexts/RequestsContext";
import { useDriverLocationSubscription } from "@/hooks/useLocationTracking";
import { BorderRadius, Spacing, Shadows, Gradients } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type LiveTrackingRouteProp = RouteProp<RootStackParamList, "LiveTracking">;

interface ETAData {
  minutes: number;
  arrivalTime: string;
  distanceKm: number;
  status: string;
}

interface Coords {
  latitude: number;
  longitude: number;
}

const MOROCCO_CENTER: Coords = { latitude: 33.5731, longitude: -7.5898 };

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const route = useRoute<LiveTrackingRouteProp>();
  const { requestId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { requests } = useRequests();
  const { driverLocation } = useDriverLocationSubscription(requestId);
  const webViewRef = useRef<any>(null);
  const initialDriverLocationRef = useRef<Coords | null>(null);

  const [etaData, setEtaData] = useState<ETAData | null>(null);
  const [isLoadingEta, setIsLoadingEta] = useState(true);

  const request = useMemo(
    () => requests.find((r) => r.id === requestId),
    [requests, requestId]
  );

  // Capture first driver location to seed the map HTML (avoids full reload on updates)
  if (driverLocation && !initialDriverLocationRef.current) {
    initialDriverLocationRef.current = driverLocation;
  }

  const fetchETA = useCallback(async () => {
    try {
      const url = new URL(`/api/eta/${requestId}`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.success && data.eta) setEtaData(data.eta);
      else setEtaData(null);
    } catch {
      // silent
    } finally {
      setIsLoadingEta(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 15000);
    return () => clearInterval(interval);
  }, [fetchETA]);

  // Inject updated driver position into Leaflet map smoothly
  useEffect(() => {
    if (driverLocation && webViewRef.current) {
      const { latitude, longitude } = driverLocation;
      webViewRef.current.injectJavaScript(
        `if(window.updateDriverPosition){window.updateDriverPosition(${latitude},${longitude});}true;`
      );
      fetchETA();
    }
  }, [driverLocation, fetchETA]);

  const getStatusInfo = useMemo(() => {
    if (!request) return { label: "", color: theme.textSecondary, icon: "truck" as const };
    switch (request.status) {
      case "accepted":
      case "paid":
        return { label: t("driverEnRoute") || "Chauffeur en route", color: theme.primary, icon: "truck" as const };
      case "driver_arrived":
        return { label: t("driverArrived"), color: theme.warning, icon: "map-pin" as const };
      case "pickup":
        return { label: t("goodsPickedUp") || "Marchandise enlevée", color: theme.warning, icon: "package" as const };
      case "in_transit":
        return { label: t("deliveryImminent") || "En cours de livraison", color: theme.success, icon: "navigation" as const };
      default:
        return { label: t("tracking") || "Suivi", color: theme.textSecondary, icon: "map-pin" as const };
    }
  }, [request?.status, theme, t]);

  // Build Leaflet HTML once from static data; driver updates are injected via JS
  const mapHtml = useMemo(() => {
    const pickup = request?.pickupCoords;
    const delivery = request?.deliveryCoords;
    const initDriver = initialDriverLocationRef.current;
    const center = initDriver || pickup || MOROCCO_CENTER;

    const pickupScript = pickup
      ? `L.marker([${pickup.latitude},${pickup.longitude}],{icon:L.divIcon({className:'cm',html:'<div style="background:#22C55E;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);font-size:19px;">📦</div>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map).bindPopup('Enlèvement');`
      : "";

    const deliveryScript = delivery
      ? `window.destCoords=[${delivery.latitude},${delivery.longitude}];L.marker([${delivery.latitude},${delivery.longitude}],{icon:L.divIcon({className:'cm',html:'<div style="background:#EF4444;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3);font-size:19px;">🏁</div>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map).bindPopup('Livraison');`
      : `window.destCoords=null;`;

    const initDriverScript = initDriver
      ? `window.driverMarker=L.marker([${initDriver.latitude},${initDriver.longitude}],{icon:driverIcon}).addTo(map);
         if(window.destCoords){window.routeLine=L.polyline([[${initDriver.latitude},${initDriver.longitude}],window.destCoords],{color:'#2563EB',weight:5,dashArray:'14,8',opacity:0.85}).addTo(map);}
         map.fitBounds([[${initDriver.latitude},${initDriver.longitude}],${delivery ? `[${delivery.latitude},${delivery.longitude}]` : `[${center.latitude},${center.longitude}]`}],{padding:[80,80]});`
      : pickup && delivery
      ? `map.fitBounds([[${pickup.latitude},${pickup.longitude}],[${delivery.latitude},${delivery.longitude}]],{padding:[80,80]});`
      : "";

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
    .cm{background:transparent!important;border:none!important}
    .leaflet-control-attribution{display:none}
    .pulse-ring{
      position:absolute;inset:-6px;border-radius:50%;
      border:3px solid rgba(37,99,235,0.5);
      animation:pulse 1.8s ease-out infinite;
    }
    @keyframes pulse{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.2);opacity:0}}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false})
             .setView([${center.latitude},${center.longitude}],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

    window.driverMarker=null;
    window.routeLine=null;
    window.destCoords=null;

    var driverIconHtml='<div style="position:relative;width:52px;height:52px;">'
      +'<div class="pulse-ring"></div>'
      +'<div style="background:#2563EB;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid white;box-shadow:0 4px 14px rgba(37,99,235,0.55);font-size:26px;">🚚</div>'
      +'</div>';
    var driverIcon=L.divIcon({className:'cm',html:driverIconHtml,iconSize:[52,52],iconAnchor:[26,26]});

    ${pickupScript}
    ${deliveryScript}
    ${initDriverScript}

    window.updateDriverPosition=function(lat,lng){
      if(window.driverMarker){
        window.driverMarker.setLatLng([lat,lng]);
      } else {
        window.driverMarker=L.marker([lat,lng],{icon:driverIcon}).addTo(map);
      }
      if(window.destCoords){
        if(window.routeLine){
          window.routeLine.setLatLngs([[lat,lng],window.destCoords]);
        } else {
          window.routeLine=L.polyline([[lat,lng],window.destCoords],{color:'#2563EB',weight:5,dashArray:'14,8',opacity:0.85}).addTo(map);
        }
      }
      map.panTo([lat,lng],{animate:true,duration:0.8});
    };

    window.centerOnDriver=function(){
      if(window.driverMarker){map.setView(window.driverMarker.getLatLng(),16,{animate:true});}
    };

    window.fitAll=function(){
      var pts=[];
      if(window.driverMarker) pts.push(window.driverMarker.getLatLng());
      if(window.destCoords) pts.push(window.destCoords);
      if(pts.length>1) map.fitBounds(pts,{padding:[80,80],animate:true});
    };
  </script>
</body>
</html>`;
  }, [request?.pickupCoords, request?.deliveryCoords]);

  const centerOnDriver = () => {
    webViewRef.current?.injectJavaScript("if(window.centerOnDriver){window.centerOnDriver();}true;");
  };

  const fitAll = () => {
    webViewRef.current?.injectJavaScript("if(window.fitAll){window.fitAll();}true;");
  };

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            {t("loading")}...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* ── Full-screen Leaflet map ── */}
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
      />

      {/* ── Map control buttons ── */}
      {driverLocation ? (
        <Pressable
          onPress={centerOnDriver}
          style={({ pressed }) => [
            styles.mapBtn,
            Shadows.md,
            { backgroundColor: theme.backgroundDefault, top: headerHeight + Spacing.md, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Icon name="crosshair" size={22} color={theme.primary} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={fitAll}
        style={({ pressed }) => [
          styles.mapBtn,
          Shadows.md,
          {
            backgroundColor: theme.backgroundDefault,
            top: headerHeight + Spacing.md + (driverLocation ? 60 : 0),
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Icon name="maximize" size={22} color={theme.primary} />
      </Pressable>

      {/* ── Bottom status card ── */}
      <View
        style={[
          styles.statusCard,
          Shadows.lg,
          { backgroundColor: theme.backgroundDefault, bottom: insets.bottom + Spacing.lg },
        ]}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={Gradients.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.statusHeader}
        >
          <View style={[styles.statusRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.statusIconContainer}>
              <Icon name={getStatusInfo.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
              <ThemedText style={styles.statusLabel}>{t("status")}</ThemedText>
              <ThemedText style={styles.statusValue}>{getStatusInfo.label}</ThemedText>
            </View>
            {driverLocation ? (
              <View style={styles.liveBadge}>
                <View style={styles.liveIndicator} />
                <ThemedText style={styles.liveText}>LIVE</ThemedText>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        {/* Info section */}
        <View style={styles.infoSection}>
          {/* ETA row */}
          {etaData ? (
            <View style={[styles.etaContainer, { backgroundColor: theme.success + "15" }]}>
              <View style={[styles.etaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.etaIconContainer, { backgroundColor: theme.success }]}>
                  <Icon name="clock" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                  <ThemedText style={[styles.etaLabel, { color: theme.success }]}>
                    {t("arrivingIn")} {etaData.status === "in_transit" ? t("toDelivery") : t("toPickup")}
                  </ThemedText>
                  <View style={[styles.etaValueRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <ThemedText style={[styles.etaValue, { color: theme.success }]}>
                      {etaData.minutes}
                    </ThemedText>
                    <ThemedText style={[styles.etaUnit, { color: theme.success }]}>
                      {t("etaMinutes")}
                    </ThemedText>
                    <View style={[styles.etaDivider, { backgroundColor: theme.success + "40" }]} />
                    <ThemedText style={[styles.etaDistance, { color: theme.success }]}>
                      {etaData.distanceKm} {t("km")}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : isLoadingEta ? (
            <View style={[styles.etaContainer, { backgroundColor: theme.border + "30" }]}>
              <View style={[styles.etaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <ActivityIndicator size="small" color={theme.textSecondary} />
                <ThemedText style={[styles.etaCalculating, { color: theme.textSecondary }]}>
                  {t("etaCalculating")}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* Driver name + distance */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.infoItem, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                {t("driver")}
              </ThemedText>
              <ThemedText style={styles.infoValue}>{request.driverName || "-"}</ThemedText>
            </View>
            <View style={[styles.infoItem, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                {t("distance")}
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {request.distance} {t("km")}
              </ThemedText>
            </View>
          </View>

          {/* Addresses */}
          <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.addressDot, { backgroundColor: theme.success }]} />
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {request.pickupAddress}
            </ThemedText>
          </View>
          <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.addressDot, { backgroundColor: theme.error }]} />
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {request.deliveryAddress}
            </ThemedText>
          </View>
        </View>

        {/* Waiting banner */}
        {!driverLocation ? (
          <View style={[styles.waitingBanner, { backgroundColor: theme.warning + "15" }]}>
            <Icon name="clock" size={16} color={theme.warning} />
            <ThemedText style={[styles.waitingText, { color: theme.warning }]}>
              {t("waitingForDriverLocation")}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  map: { flex: 1 },
  mapBtn: {
    position: "absolute",
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  statusHeader: { padding: Spacing.lg },
  statusRow: { alignItems: "center", gap: Spacing.md },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  statusValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  infoSection: { padding: Spacing.lg, gap: Spacing.md },
  etaContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  etaRow: { alignItems: "center", gap: Spacing.md },
  etaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  etaLabel: { fontSize: 12, fontWeight: "500" },
  etaValueRow: { alignItems: "baseline", gap: 4, marginTop: 2 },
  etaValue: { fontSize: 24, fontWeight: "700", fontFamily: "Poppins_600SemiBold" },
  etaUnit: { fontSize: 14, fontWeight: "600" },
  etaDivider: { width: 1, height: 16, marginHorizontal: Spacing.sm },
  etaDistance: { fontSize: 14, fontWeight: "500" },
  etaCalculating: { fontSize: 13, marginLeft: Spacing.sm },
  infoRow: { justifyContent: "space-between" },
  infoItem: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: { fontSize: 15, fontWeight: "600" },
  addressRow: { alignItems: "center", gap: Spacing.sm },
  addressDot: { width: 8, height: 8, borderRadius: 4 },
  addressText: { flex: 1, fontSize: 13 },
  waitingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  waitingText: { fontSize: 13, fontWeight: "500" },
});
