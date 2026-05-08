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
  updateInterval = 3000,
}: UseLocationTrackingOptions) {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      } catch {
        // silent
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
          distanceInterval: 5,
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
    } catch {
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
    } catch {
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

function getWsUrl(): string {
  const apiUrl = getApiUrl();
  if (apiUrl.startsWith("https://")) {
    return apiUrl.replace("https://", "wss://") + "/api/ws";
  }
  return apiUrl.replace("http://", "ws://") + "/api/ws";
}

export function useDriverLocationSubscription(requestId?: string) {
  const [driverLocation, setDriverLocation] = useState<LocationCoordinates | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!requestId) return;

    // ─── HTTP fetch (initial + fallback polling every 3 s) ───────────────
    const fetchDriverLocation = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(
          new URL(`/api/location/${requestId}`, apiUrl).toString()
        );
        if (response.ok) {
          const data = await response.json();
          if (data.location && mountedRef.current) {
            setDriverLocation(data.location);
          }
        }
      } catch {
        // silent
      }
    };

    fetchDriverLocation();
    pollingRef.current = setInterval(fetchDriverLocation, 3000);

    // ─── WebSocket – real-time updates ───────────────────────────────────
    let ws: WebSocket | null = null;

    const connectWs = () => {
      if (!mountedRef.current) return;
      try {
        ws = new WebSocket(getWsUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          // Register as a read-only tracker so the server can route targeted msgs
          ws?.send(
            JSON.stringify({ type: "REGISTER_USER", userId: `tracker_${requestId}`, role: "client" })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string);
            if (
              msg.type === "LOCATION_UPDATE" &&
              msg.requestId === requestId &&
              msg.location &&
              mountedRef.current
            ) {
              setDriverLocation(msg.location);
            }
          } catch {
            // silent
          }
        };

        ws.onerror = () => {};

        ws.onclose = () => {
          wsRef.current = null;
          // Reconnect after 4 s if still mounted
          if (mountedRef.current) {
            reconnectRef.current = setTimeout(connectWs, 4000);
          }
        };
      } catch {
        // WebSocket not supported or blocked — polling covers it
      }
    };

    connectWs();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [requestId]);

  return { driverLocation };
}
