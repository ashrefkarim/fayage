import { useState, useEffect, useCallback, useRef } from "react";
import { getApiUrl } from "@/lib/query-client";

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface NearbyDriver {
  id: string;
  name: string;
  vehicleType: string;
  location: LocationCoordinates;
  isAvailable: boolean;
  rating?: number;
}

interface UseNearbyDriversOptions {
  userLocation?: LocationCoordinates | null;
  radius?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useNearbyDrivers({
  userLocation,
  radius = 10,
  refreshInterval = 10000,
  enabled = true,
}: UseNearbyDriversOptions = {}) {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNearbyDrivers = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();
      let url = new URL("/api/drivers/nearby", apiUrl);
      
      if (userLocation) {
        url.searchParams.append("lat", userLocation.latitude.toString());
        url.searchParams.append("lng", userLocation.longitude.toString());
        url.searchParams.append("radius", radius.toString());
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.success) {
        setDrivers(data.drivers || []);
      } else {
        setError(data.error || "Failed to fetch drivers");
      }
    } catch (err) {
      setError("Failed to fetch nearby drivers");
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, radius, enabled]);

  useEffect(() => {
    if (enabled) {
      fetchNearbyDrivers();
      intervalRef.current = setInterval(fetchNearbyDrivers, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNearbyDrivers, refreshInterval, enabled]);

  return {
    drivers,
    isLoading,
    error,
    refetch: fetchNearbyDrivers,
  };
}
