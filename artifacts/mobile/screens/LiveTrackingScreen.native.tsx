import React, { useEffect, useRef, useState, useMemo, memo, useCallback, forwardRef } from "react";
import { View, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
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

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_GOOGLE: any = undefined;
let mapsAvailable = false;

try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  mapsAvailable = true;
} catch (e) {
  mapsAvailable = false;
}

interface ETAData {
  minutes: number;
  arrivalTime: string;
  distanceKm: number;
  status: string;
}

type LiveTrackingRouteProp = RouteProp<RootStackParamList, "LiveTracking">;

interface Coords {
  latitude: number;
  longitude: number;
}

const MOROCCO_CENTER: Coords = {
  latitude: 33.5731,
  longitude: -7.5898,
};

const WebMapFallback = forwardRef<WebView, {
  pickupCoords?: Coords;
  deliveryCoords?: Coords;
  initialDriverLocation?: Coords;
}>(function WebMapFallback({ pickupCoords, deliveryCoords, initialDriverLocation }, ref) {
  const { theme } = useTheme();

  const center = initialDriverLocation || pickupCoords || MOROCCO_CENTER;

  const pickupMarker = pickupCoords ? `
    L.marker([${pickupCoords.latitude}, ${pickupCoords.longitude}], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background:#22C55E;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:16px;">📦</div>',
        iconSize: [32, 32], iconAnchor: [16, 16]
      })
    }).addTo(map).bindPopup('Enlèvement');
  ` : '';

  const deliveryMarker = deliveryCoords ? `
    window.destCoords = [${deliveryCoords.latitude}, ${deliveryCoords.longitude}];
    L.marker([${deliveryCoords.latitude}, ${deliveryCoords.longitude}], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background:#EF4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:16px;">🏁</div>',
        iconSize: [32, 32], iconAnchor: [16, 16]
      })
    }).addTo(map).bindPopup('Livraison');
  ` : 'window.destCoords = null;';

  const initialDriver = initialDriverLocation ? `
    var driverIcon = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background:#3B82F6;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:22px;">🚚</div>',
      iconSize: [44, 44], iconAnchor: [22, 22]
    });
    window.driverMarker = L.marker([${initialDriverLocation.latitude}, ${initialDriverLocation.longitude}], { icon: driverIcon }).addTo(map);
    if (window.destCoords) {
      window.routeLine = L.polyline([[${initialDriverLocation.latitude}, ${initialDriverLocation.longitude}], window.destCoords], {color:'#3B82F6', weight:4, dashArray:'10,6'}).addTo(map);
    }
    map.fitBounds([
      [${initialDriverLocation.latitude}, ${initialDriverLocation.longitude}],
      ${deliveryCoords ? `[${deliveryCoords.latitude}, ${deliveryCoords.longitude}]` : `[${center.latitude}, ${center.longitude}]`}
    ], {padding:[80,80]});
  ` : (pickupCoords && deliveryCoords ? `
    map.fitBounds([[${pickupCoords.latitude}, ${pickupCoords.longitude}],[${deliveryCoords.latitude}, ${deliveryCoords.longitude}]], {padding:[80,80]});
  ` : '');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker { background: transparent !important; border: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
               .setView([${center.latitude}, ${center.longitude}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    window.driverMarker = null;
    window.routeLine = null;
    window.destCoords = null;

    ${pickupMarker}
    ${deliveryMarker}
    ${initialDriver}

    var driverIconHtml = '<div style="background:#3B82F6;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:22px;">🚚</div>';
    var driverIcon = L.divIcon({ className: 'custom-marker', html: driverIconHtml, iconSize: [44,44], iconAnchor: [22,22] });

    window.updateDriverPosition = function(lat, lng) {
      if (window.driverMarker) {
        window.driverMarker.setLatLng([lat, lng]);
      } else {
        window.driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(map);
      }
      if (window.destCoords) {
        if (window.routeLine) {
          window.routeLine.setLatLngs([[lat, lng], window.destCoords]);
        } else {
          window.routeLine = L.polyline([[lat, lng], window.destCoords], {color:'#3B82F6', weight:4, dashArray:'10,6'}).addTo(map);
        }
      }
      map.panTo([lat, lng]);
    };
  </script>
</body>
</html>`;

  return (
    <WebView
      ref={ref}
      source={{ html }}
      style={styles.map}
      scrollEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}
    />
  );
});

const MemoizedDriverMarker = memo(function MemoizedDriverMarker({
  coordinate,
  title,
  backgroundColor,
}: {
  coordinate: Coords;
  title: string;
  backgroundColor: string;
}) {
  if (!mapsAvailable || !Marker) return null;
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.driverMarker, { backgroundColor }]}>
        <Icon name="truck" size={16} color="#FFFFFF" />
      </View>
    </Marker>
  );
});

const MemoizedLocationMarker = memo(function MemoizedLocationMarker({
  coordinate,
  title,
  description,
  backgroundColor,
  iconName,
}: {
  coordinate: Coords;
  title: string;
  description?: string;
  backgroundColor: string;
  iconName: "arrow-up-circle" | "flag";
}) {
  if (!mapsAvailable || !Marker) return null;
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
    >
      <View style={[styles.locationMarker, { backgroundColor }]}>
        <Icon name={iconName} size={16} color="#FFFFFF" />
      </View>
    </Marker>
  );
});

export default function LiveTrackingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const route = useRoute<LiveTrackingRouteProp>();
  const { requestId } = route.params;
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { requests } = useRequests();
  const { driverLocation } = useDriverLocationSubscription(requestId);
  const mapRef = useRef<any>(null);
  const webViewRef = useRef<WebView | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasInitiallyFitted = useRef(false);
  // Capture the very first driver location to seed the WebView HTML (avoids full reload)
  const initialDriverLocationRef = useRef<Coords | null>(null);
  if (driverLocation && !initialDriverLocationRef.current) {
    initialDriverLocationRef.current = driverLocation;
  }
  const [etaData, setEtaData] = useState<ETAData | null>(null);
  const [isLoadingEta, setIsLoadingEta] = useState(true);

  const request = useMemo(() => 
    requests.find((r) => r.id === requestId),
    [requests, requestId]
  );

  const fetchETA = useCallback(async () => {
    try {
      const url = new URL(`/api/eta/${requestId}`, getApiUrl());
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success && data.eta) {
        setEtaData(data.eta);
      } else {
        setEtaData(null);
      }
    } catch (error) {
      console.log("Failed to fetch ETA:", error);
    } finally {
      setIsLoadingEta(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchETA();
    const interval = setInterval(fetchETA, 15000);
    return () => clearInterval(interval);
  }, [fetchETA]);

  useEffect(() => {
    if (driverLocation) {
      fetchETA();
      // Push updated driver position into WebView without reloading the map
      if (!mapsAvailable && webViewRef.current) {
        const { latitude, longitude } = driverLocation;
        webViewRef.current.injectJavaScript(
          `if(window.updateDriverPosition){window.updateDriverPosition(${latitude},${longitude});}true;`
        );
      }
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

  const initialRegion = useMemo(() => {
    const fallback = {
      latitude: 33.5731,
      longitude: -7.5898,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
    
    if (driverLocation) {
      return { ...driverLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    if (request?.pickupCoords) {
      return { ...request.pickupCoords, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    return fallback;
  }, []);

  const fitToMarkers = () => {
    if (!mapsAvailable || !mapRef.current || !request) return;

    const coordinates: Coords[] = [];
    
    if (driverLocation) {
      coordinates.push(driverLocation);
    }
    
    if (request.pickupCoords) {
      coordinates.push(request.pickupCoords);
    }
    
    if (request.deliveryCoords) {
      coordinates.push(request.deliveryCoords);
    }

    if (coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (mapsAvailable && isMapReady && driverLocation && !hasInitiallyFitted.current) {
      hasInitiallyFitted.current = true;
      setTimeout(() => fitToMarkers(), 500);
    }
  }, [isMapReady, driverLocation]);

  const centerOnDriver = () => {
    if (mapsAvailable && mapRef.current && driverLocation) {
      mapRef.current.animateToRegion({
        ...driverLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleMapReady = () => {
    setIsMapReady(true);
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
      {mapsAvailable && MapView ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          onMapReady={handleMapReady}
          showsUserLocation
          showsMyLocationButton={false}
          moveOnMarkerPress={false}
        >
          {driverLocation ? (
            <MemoizedDriverMarker
              coordinate={driverLocation}
              title={request.driverName || t("driver")}
              backgroundColor={theme.primary}
            />
          ) : null}

          {request.pickupCoords ? (
            <MemoizedLocationMarker
              coordinate={request.pickupCoords}
              title={t("pickup")}
              description={request.pickupAddress}
              backgroundColor={theme.success}
              iconName="arrow-up-circle"
            />
          ) : null}

          {request.deliveryCoords ? (
            <MemoizedLocationMarker
              coordinate={request.deliveryCoords}
              title={t("delivery")}
              description={request.deliveryAddress}
              backgroundColor={theme.error}
              iconName="flag"
            />
          ) : null}

          {driverLocation && request.deliveryCoords && Polyline ? (
            <Polyline
              coordinates={[driverLocation, request.deliveryCoords]}
              strokeColor={theme.primary}
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          ) : null}
        </MapView>
      ) : (
        <WebMapFallback
          ref={webViewRef}
          pickupCoords={request.pickupCoords}
          deliveryCoords={request.deliveryCoords}
          initialDriverLocation={initialDriverLocationRef.current ?? undefined}
        />
      )}

      <View style={[styles.statusCard, Shadows.lg, { 
        backgroundColor: theme.backgroundDefault,
        bottom: insets.bottom + Spacing.lg,
      }]}>
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

        <View style={styles.infoSection}>
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

          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.infoItem, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                {t("driver")}
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {request.driverName || "-"}
              </ThemedText>
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

        {driverLocation ? null : (
          <View style={[styles.waitingBanner, { backgroundColor: theme.warning + "15" }]}>
            <Icon name="clock" size={16} color={theme.warning} />
            <ThemedText style={[styles.waitingText, { color: theme.warning }]}>
              {t("waitingForDriverLocation")}
            </ThemedText>
          </View>
        )}
      </View>

      {mapsAvailable && driverLocation ? (
        <Pressable
          onPress={centerOnDriver}
          style={({ pressed }) => [
            styles.centerButton,
            Shadows.md,
            { 
              backgroundColor: theme.backgroundDefault,
              top: headerHeight + Spacing.md,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="crosshair" size={22} color={theme.primary} />
        </Pressable>
      ) : null}

      {mapsAvailable ? (
        <Pressable
          onPress={fitToMarkers}
          style={({ pressed }) => [
            styles.fitButton,
            Shadows.md,
            { 
              backgroundColor: theme.backgroundDefault,
              top: headerHeight + Spacing.md + (driverLocation ? 56 : 0),
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Icon name="maximize" size={22} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  locationMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  statusCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  statusHeader: {
    padding: Spacing.lg,
  },
  statusRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
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
  infoSection: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  etaContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  etaRow: {
    alignItems: "center",
    gap: Spacing.md,
  },
  etaIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  etaLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  etaValueRow: {
    alignItems: "baseline",
    gap: 4,
    marginTop: 2,
  },
  etaValue: {
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "Poppins_600SemiBold",
  },
  etaUnit: {
    fontSize: 14,
    fontWeight: "600",
  },
  etaDivider: {
    width: 1,
    height: 16,
    marginHorizontal: Spacing.sm,
  },
  etaDistance: {
    fontSize: 14,
    fontWeight: "500",
  },
  etaCalculating: {
    fontSize: 13,
    marginLeft: Spacing.sm,
  },
  infoRow: {
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  addressRow: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  addressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
  },
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
  waitingText: {
    fontSize: 13,
    fontWeight: "500",
  },
  centerButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  fitButton: {
    position: "absolute",
    right: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
