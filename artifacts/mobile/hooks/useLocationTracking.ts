import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { getApiUrl } from "@/lib/query-client";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

interface UseLocationTrackingOptions {
  enabled?: boolean;
  userId?: string;
  requestId?: string;
  updateInterval?: number;
}

export function useLocationTracking({
  enabled = false,
  userId,
  requestId,
  updateInterval = 5000,
}: UseLocationTrackingOptions) {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const sendLocationUpdate = useCallback(
    async (location: LocationCoordinates) => {
      if (!userId || !requestId) return;

      try {
        const apiUrl = getApiUrl();
        await fetch(new URL("/api/location/update", apiUrl).toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            requestId,
            location,
            timestamp: Date.now(),
          }),
        });
      } catch (err) {
        console.error("Failed to send location update:", err);
      }
    },
    [userId, requestId]
  );

  const startTracking = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return;
      }

      setIsTracking(true);
      setError(null);

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: updateInterval,
          distanceInterval: 10,
        },
        (location) => {
          const coords: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(coords);
          sendLocationUpdate(coords);
        }
      );
    } catch (err) {
      setError("Failed to start location tracking");
      setIsTracking(false);
    }
  }, [updateInterval, sendLocationUpdate]);

  const stopTracking = useCallback(() => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    if (enabled && userId && requestId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, userId, requestId, startTracking, stopTracking]);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied");
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (err) {
      setError("Failed to get current location");
      return null;
    }
  }, []);

  return {
    currentLocation,
    isTracking,
    error,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
}

export function useDriverLocationSubscription(requestId?: string) {
  const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const fetchDriverLocation = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(
          new URL(`/api/location/${requestId}`, apiUrl).toString()
        );
        if (response.ok) {
          const data = await response.json();
          if (data.location) {
            setDriverLocation(data.location);
          }
        }
      } catch (err) {
        console.error("Failed to fetch driver location:", err);
      }
    };

    fetchDriverLocation();
    pollingRef.current = setInterval(fetchDriverLocation, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [requestId]);

  return { driverLocation };
}
