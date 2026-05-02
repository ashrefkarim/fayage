import React from "react";
import { View, StyleSheet } from "react-native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

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

export function MapViewComponent({
  style,
}: MapViewComponentProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={[styles.webFallback, { backgroundColor: theme.backgroundSecondary }, style]}>
      <Icon name="map-pin" size={40} color={theme.textSecondary} />
      <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
        {t("loadingMap")}
      </ThemedText>
      <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginTop: Spacing.xs, textAlign: "center", opacity: 0.7 }}>
        Run in Expo Go to use this feature
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    minHeight: 150,
  },
});
