import { useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

interface UseDriverLocationTrackingOptions {
  enabled?: boolean;
  updateInterval?: number;
}

export function useDriverLocationTracking({
  enabled = true,
  updateInterval = 15000,
}: UseDriverLocationTrackingOptions = {}) {
  const { user } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDriver = user?.role === "driver";
  const isVerified = user?.verificationStatus === "verified";

  const sendLocationUpdate = useCallback(async () => {
    if (!user || !isDriver) return;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== "granted") return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const response = await fetch(new URL("/api/drivers/location", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: user.id,
          name: user.fullName,
          vehicleType: user.vehicleType || "van",
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          isAvailable: isVerified,
          rating: user.rating || 0,
        }),
      });

      if (!response.ok) {
        console.log("Failed to update driver location");
      }
    } catch (error) {
      console.log("Error updating driver location:", error);
    }
  }, [user, isDriver, isVerified]);

  useEffect(() => {
    if (!enabled || !isDriver || Platform.OS === "web") return;

    sendLocationUpdate();

    intervalRef.current = setInterval(sendLocationUpdate, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, isDriver, sendLocationUpdate, updateInterval]);

  return { sendLocationUpdate };
}
