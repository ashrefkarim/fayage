import React, { useEffect, useRef, useState, useMemo, memo } from "react";
import { View, StyleSheet, ActivityIndicator, Platform, Text } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { Icon, IconName } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let mapsAvailable = false;

try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
  mapsAvailable = true;
} catch (e) {
  mapsAvailable = false;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface DriverMarker {
  id: string;
  name: string;
  vehicleType: string;
  location: LocationCoordinates;
  isAvailable: boolean;
  rating?: number;
}

export interface OrderMarker {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupCoords: LocationCoordinates;
  deliveryCoords?: LocationCoordinates;
  vehicleType: string;
  proposedPrice: number;
  distance: number;
}

interface MapViewComponentProps {
  pickupLocation?: LocationCoordinates;
  dropoffLocation?: LocationCoordinates;
  driverLocation?: LocationCoordinates;
  nearbyDrivers?: DriverMarker[];
  nearbyOrders?: OrderMarker[];
  showUserLocation?: boolean;
  isTracking?: boolean;
  onMapReady?: () => void;
  onRegionChange?: (region: any) => void;
  onOrderPress?: (order: OrderMarker) => void;
  style?: object;
}

const MOROCCO_CENTER: LocationCoordinates = {
  latitude: 33.5731,
  longitude: -7.5898,
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const WebMapFallback = memo(function WebMapFallback({
  pickupLocation,
  dropoffLocation,
  driverLocation,
  userLocation,
  style,
}: {
  pickupLocation?: LocationCoordinates;
  dropoffLocation?: LocationCoordinates;
  driverLocation?: LocationCoordinates;
  userLocation?: LocationCoordinates | null;
  style?: object;
}) {
  const { theme } = useTheme();
  
  const html = useMemo(() => {
    const center = driverLocation || pickupLocation || userLocation || MOROCCO_CENTER;
    const zoom = 14;

    const markers: string[] = [];
    
    if (pickupLocation) {
      markers.push(`
        L.marker([${pickupLocation.latitude}, ${pickupLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#22C55E;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }).addTo(map).bindPopup('Pickup');
      `);
    }
    
    if (dropoffLocation) {
      markers.push(`
        L.marker([${dropoffLocation.latitude}, ${dropoffLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#EF4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
          })
        }).addTo(map).bindPopup('Delivery');
      `);
    }
    
    if (driverLocation) {
      markers.push(`
        L.marker([${driverLocation.latitude}, ${driverLocation.longitude}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:#3B82F6;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(map).bindPopup('Driver');
      `);
    }

    let polylineCode = '';
    if (pickupLocation && dropoffLocation) {
      polylineCode = `
        L.polyline([
          [${pickupLocation.latitude}, ${pickupLocation.longitude}],
          [${dropoffLocation.latitude}, ${dropoffLocation.longitude}]
        ], {color: '#3B82F6', weight: 3, dashArray: '10, 5'}).addTo(map);
      `;
    }

    let fitBoundsCode = '';
    const coords: LocationCoordinates[] = [];
    if (pickupLocation) coords.push(pickupLocation);
    if (dropoffLocation) coords.push(dropoffLocation);
    if (driverLocation) coords.push(driverLocation);
    
    if (coords.length > 1) {
      fitBoundsCode = `
        map.fitBounds([
          ${coords.map(c => `[${c.latitude}, ${c.longitude}]`).join(',')}
        ], {padding: [50, 50]});
      `;
    }

    return `
      <!DOCTYPE html>
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
          var map = L.map('map', {
            zoomControl: false,
            attributionControl: false
          }).setView([${center.latitude}, ${center.longitude}], ${zoom});
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);
          
          ${markers.join('\n')}
          ${polylineCode}
          ${fitBoundsCode}
        </script>
      </body>
      </html>
    `;
  }, [
    pickupLocation?.latitude,
    pickupLocation?.longitude,
    dropoffLocation?.latitude,
    dropoffLocation?.longitude,
    driverLocation?.latitude,
    driverLocation?.longitude,
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  return (
    <View style={[styles.container, style]}>
      <WebView
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
    </View>
  );
});

export function MapViewComponent({
  pickupLocation,
  dropoffLocation,
  driverLocation,
  nearbyDrivers = [],
  nearbyOrders = [],
  showUserLocation = true,
  isTracking = false,
  onMapReady,
  onRegionChange,
  onOrderPress,
  style,
}: MapViewComponentProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        
        setHasPermission(status === "granted");

        if (status === "granted") {
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            if (!isMounted) return;
            
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          } catch (error) {
            console.log("Error getting location:", error);
          }
        }
      } catch (error) {
        console.log("Permission error:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (mapsAvailable && mapRef.current && (pickupLocation || dropoffLocation || driverLocation)) {
      const coordinates: LocationCoordinates[] = [];
      if (pickupLocation) coordinates.push(pickupLocation);
      if (dropoffLocation) coordinates.push(dropoffLocation);
      if (driverLocation) coordinates.push(driverLocation);

      if (coordinates.length > 0) {
        try {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        } catch (error) {
          console.log("Error fitting coordinates:", error);
        }
      }
    }
  }, [pickupLocation, dropoffLocation, driverLocation]);

  const getInitialRegion = () => {
    if (pickupLocation) {
      return { ...pickupLocation, ...DEFAULT_DELTA };
    }
    if (userLocation) {
      return { ...userLocation, ...DEFAULT_DELTA };
    }
    return { ...MOROCCO_CENTER, ...DEFAULT_DELTA };
  };

  const getVehicleIcon = (vehicleType: string): IconName => {
    switch (vehicleType) {
      case "tricycle":
        return "truck";
      case "van":
        return "truck";
      case "truck_3_5t":
      case "truck_10t":
      case "semi":
        return "truck";
      default:
        return "truck";
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundSecondary }, style]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          {t("loadingMap")}
        </ThemedText>
      </View>
    );
  }

  if (!mapsAvailable) {
    return (
      <WebMapFallback
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        driverLocation={driverLocation}
        userLocation={userLocation}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={showUserLocation && hasPermission}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => {
          try {
            onMapReady?.();
          } catch (error) {
            console.log("Map ready error:", error);
          }
        }}
        onRegionChangeComplete={onRegionChange}
      >
        {pickupLocation ? (
          <Marker coordinate={pickupLocation} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.markerContainer, { backgroundColor: theme.success }]}>
              <Icon name="package" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        ) : null}

        {dropoffLocation ? (
          <Marker coordinate={dropoffLocation} anchor={{ x: 0.5, y: 1 }}>
            <View style={[styles.markerContainer, { backgroundColor: theme.error }]}>
              <Icon name="map-pin" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        ) : null}

        {driverLocation ? (
          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.driverMarker, { backgroundColor: theme.primary }]}>
              <Icon name="truck" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        ) : null}

        {nearbyDrivers.map((driver) => (
          <Marker
            key={driver.id}
            coordinate={driver.location}
            anchor={{ x: 0.5, y: 0.5 }}
            title={driver.name}
            description={t(driver.vehicleType)}
          >
            <View
              style={[
                styles.driverMarker,
                {
                  backgroundColor: driver.isAvailable ? theme.success : theme.textSecondary,
                },
              ]}
            >
              <Icon name={getVehicleIcon(driver.vehicleType)} size={18} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {nearbyOrders.map((order) => (
          <Marker
            key={`order-${order.id}`}
            coordinate={order.pickupCoords}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onOrderPress?.(order)}
          >
            <View style={[styles.orderMarker, { backgroundColor: theme.secondary }]}>
              <Icon name="package" size={18} color="#FFFFFF" />
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>
                  {order.proposedPrice}
                </Text>
              </View>
            </View>
          </Marker>
        ))}

        {pickupLocation && dropoffLocation ? (
          <Polyline
            coordinates={[pickupLocation, dropoffLocation]}
            strokeColor={theme.primary}
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        ) : null}

        {isTracking && driverLocation && dropoffLocation ? (
          <Polyline
            coordinates={[driverLocation, dropoffLocation]}
            strokeColor={theme.secondary}
            strokeWidth={4}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  orderMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  orderBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF8C00",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  orderBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
