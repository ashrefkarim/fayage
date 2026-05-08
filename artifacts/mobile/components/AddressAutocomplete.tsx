import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { Icon, IconName } from "@/components/Icon";
import * as Location from "expo-location";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress: (address: string, coords?: { latitude: number; longitude: number }) => void;
  placeholder: string;
  iconColor: string;
  iconName: IconName;
  onOpenMapPicker?: () => void;
}

interface Suggestion {
  text: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  isGoogle?: boolean;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectAddress,
  placeholder,
  iconColor,
  iconName,
  onOpenMapPicker,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const { isRTL, t } = useLanguage();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchGoogle = useCallback(async (query: string) => {
    if (!GOOGLE_KEY || query.length < 3) return null;
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&language=fr&components=country:ma`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.predictions) {
      return data.predictions.slice(0, 8).map((p: any) => ({
        text: p.description.replace(", Maroc", "").replace(", Morocco", ""),
        placeId: p.place_id,
        isGoogle: true,
      })) as Suggestion[];
    }
    return null;
  }, []);

  const searchNominatim = useCallback(async (query: string): Promise<Suggestion[]> => {
    if (query.length < 3) return [];
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Maroc")}&limit=8&addressdetails=1&countrycodes=ma`;
    const res = await fetch(url, { headers: { "User-Agent": "FAYAGE-App/1.0" } });
    const data = await res.json();
    return data.map((item: any) => ({
      text: item.display_name
        .replace(", Morocco", "")
        .replace(", Maroc", ""),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      isGoogle: false,
    })) as Suggestion[];
  }, []);

  const runSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const google = await searchGoogle(query);
      if (google && google.length > 0) {
        setSuggestions(google);
      } else {
        const nominatim = await searchNominatim(query);
        setSuggestions(nominatim);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchGoogle, searchNominatim]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => runSearch(value), 450);
    } else {
      setSuggestions([]);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [value, runSearch]);

  const fetchPlaceCoords = useCallback(async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    if (!GOOGLE_KEY) return null;
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.result?.geometry?.location) {
      return data.result.geometry.location;
    }
    return null;
  }, []);

  const handleSelectSuggestion = useCallback(async (suggestion: Suggestion) => {
    onChangeText(suggestion.text);
    setShowSuggestions(false);
    setSuggestions([]);
    Keyboard.dismiss();

    if (suggestion.placeId && GOOGLE_KEY) {
      const coords = await fetchPlaceCoords(suggestion.placeId);
      if (coords) {
        onSelectAddress(suggestion.text, { latitude: coords.lat, longitude: coords.lng });
      } else {
        onSelectAddress(suggestion.text);
      }
    } else if (suggestion.lat && suggestion.lng) {
      onSelectAddress(suggestion.text, { latitude: suggestion.lat, longitude: suggestion.lng });
    } else {
      onSelectAddress(suggestion.text);
    }
  }, [onChangeText, onSelectAddress, fetchPlaceCoords]);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setIsLoadingLocation(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      let address = "";
      const { latitude, longitude } = location.coords;

      // 1) Try Google Geocoding API
      if (GOOGLE_KEY) {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_KEY}&language=fr`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.status === "OK" && data.results?.[0]) {
            address = data.results[0].formatted_address
              .replace(", Maroc", "")
              .replace(", Morocco", "");
          }
        } catch {
          // fall through
        }
      }

      // 2) Nominatim fallback (no key needed)
      if (!address) {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`;
          const res = await fetch(url, { headers: { "User-Agent": "FAYAGE-App/1.0" } });
          const data = await res.json();
          if (data?.display_name) {
            const parts: string[] = data.display_name
              .split(", ")
              .filter((p: string) => !["Maroc", "Morocco", "المغرب"].includes(p));
            address = parts.slice(0, 4).join(", ");
          }
        } catch {
          // fall through
        }
      }

      // 3) Device geocoder fallback
      if (!address) {
        try {
          const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geo) {
            address = [geo.street, geo.district, geo.city].filter(Boolean).join(", ");
          }
        } catch {
          // fall through
        }
      }

      if (!address) address = t("currentLocation");

      onChangeText(address);
      onSelectAddress(address, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      // silent
    } finally {
      setIsLoadingLocation(false);
      setShowSuggestions(false);
    }
  };

  const hasMapPicker = !!onOpenMapPicker;

  return (
    <View style={styles.container}>
      <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault }]}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + "20" }]}>
          <Icon name={iconName} size={16} color={iconColor} />
        </View>

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 300)}
        />

        {isSearching ? (
          <ActivityIndicator
            size="small"
            color={theme.primary}
            style={styles.sideBtn}
          />
        ) : (
          <>
            {hasMapPicker && (
              <Pressable
                onPress={onOpenMapPicker}
                style={({ pressed }) => [
                  styles.sideBtn,
                  { backgroundColor: iconColor + "15", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Icon name="map" size={18} color={iconColor} />
              </Pressable>
            )}
            <Pressable
              onPress={handleUseCurrentLocation}
              style={({ pressed }) => [
                styles.sideBtn,
                {
                  backgroundColor: theme.primary + "15",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {isLoadingLocation ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Icon name="crosshair" size={18} color={theme.primary} />
              )}
            </Pressable>
          </>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {suggestions.map((item, index) => (
              <Pressable
                key={`${item.text}-${index}`}
                onPress={() => handleSelectSuggestion(item)}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSecondary
                      : "transparent",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Icon
                  name={item.isGoogle ? "map-pin" : "globe"}
                  size={14}
                  color={item.isGoogle ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  style={[
                    styles.suggestionText,
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                  numberOfLines={2}
                >
                  {item.text}
                </ThemedText>
                {item.isGoogle && (
                  <ThemedText style={[styles.googleBadge, { color: theme.primary }]}>
                    G
                  </ThemedText>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.sm,
  },
  sideBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: BorderRadius.md,
    maxHeight: 260,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  suggestionItem: {
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: "center",
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
  },
  googleBadge: {
    fontSize: 11,
    fontWeight: "700",
  },
});
