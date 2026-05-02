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

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectAddress: (address: string, coords?: { latitude: number; longitude: number }) => void;
  placeholder: string;
  iconColor: string;
  iconName: IconName;
}

const MOROCCAN_CITIES = [
  { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
  { name: "Rabat", lat: 34.0209, lng: -6.8416 },
  { name: "Marrakech", lat: 31.6295, lng: -7.9811 },
  { name: "Fès", lat: 34.0331, lng: -5.0003 },
  { name: "Tanger", lat: 35.7595, lng: -5.8340 },
  { name: "Agadir", lat: 30.4278, lng: -9.5981 },
  { name: "Meknès", lat: 33.8935, lng: -5.5547 },
  { name: "Oujda", lat: 34.6814, lng: -1.9086 },
  { name: "Kénitra", lat: 34.2610, lng: -6.5802 },
  { name: "Tétouan", lat: 35.5889, lng: -5.3626 },
  { name: "Salé", lat: 34.0531, lng: -6.7985 },
  { name: "Nador", lat: 35.1667, lng: -2.9333 },
  { name: "Mohammedia", lat: 33.6861, lng: -7.3833 },
  { name: "El Jadida", lat: 33.2316, lng: -8.5007 },
  { name: "Beni Mellal", lat: 32.3373, lng: -6.3498 },
  { name: "Safi", lat: 32.2994, lng: -9.2372 },
  { name: "Khouribga", lat: 32.8811, lng: -6.9063 },
  { name: "Taza", lat: 34.2100, lng: -4.0100 },
  { name: "Settat", lat: 33.0019, lng: -7.6169 },
  { name: "Berrechid", lat: 33.2653, lng: -7.5878 },
  { name: "Khémisset", lat: 33.8239, lng: -6.0661 },
  { name: "Errachidia", lat: 31.9314, lng: -4.4267 },
  { name: "Ouarzazate", lat: 30.9189, lng: -6.8936 },
  { name: "Essaouira", lat: 31.5125, lng: -9.7700 },
  { name: "Guelmim", lat: 28.9871, lng: -10.0582 },
  { name: "Laâyoune", lat: 27.1253, lng: -13.1625 },
  { name: "Dakhla", lat: 23.6847, lng: -15.9580 },
  { name: "Ifrane", lat: 33.5333, lng: -5.1167 },
  { name: "Chefchaouen", lat: 35.1689, lng: -5.2636 },
  { name: "Al Hoceima", lat: 35.2517, lng: -3.9372 },
  { name: "Azrou", lat: 33.4372, lng: -5.2211 },
  { name: "Midelt", lat: 32.6850, lng: -4.7450 },
  { name: "Tiznit", lat: 29.6972, lng: -9.7322 },
  { name: "Taroudant", lat: 30.4700, lng: -8.8800 },
  { name: "Larache", lat: 35.1932, lng: -6.1561 },
  { name: "Ksar El Kebir", lat: 34.9992, lng: -5.9022 },
];

const CASABLANCA_NEIGHBORHOODS = [
  { name: "Maârif, Casablanca", lat: 33.5792, lng: -7.6331 },
  { name: "Anfa, Casablanca", lat: 33.5850, lng: -7.6508 },
  { name: "Gauthier, Casablanca", lat: 33.5883, lng: -7.6150 },
  { name: "Racine, Casablanca", lat: 33.5950, lng: -7.6200 },
  { name: "Bourgogne, Casablanca", lat: 33.5817, lng: -7.6183 },
  { name: "Mers Sultan, Casablanca", lat: 33.5767, lng: -7.6133 },
  { name: "Hay Hassani, Casablanca", lat: 33.5567, lng: -7.6717 },
  { name: "Sidi Moumen, Casablanca", lat: 33.5833, lng: -7.5167 },
  { name: "Ain Chock, Casablanca", lat: 33.5333, lng: -7.5667 },
  { name: "Ain Sebaa, Casablanca", lat: 33.6083, lng: -7.5417 },
  { name: "Derb Sultan, Casablanca", lat: 33.5683, lng: -7.5983 },
  { name: "Médina, Casablanca", lat: 33.6000, lng: -7.6167 },
  { name: "Oulfa, Casablanca", lat: 33.5517, lng: -7.6467 },
  { name: "Sbata, Casablanca", lat: 33.5367, lng: -7.5533 },
  { name: "Hay Moulay Rachid, Casablanca", lat: 33.5467, lng: -7.5267 },
  { name: "Belvédère, Casablanca", lat: 33.5683, lng: -7.5850 },
  { name: "Californie, Casablanca", lat: 33.5533, lng: -7.5883 },
  { name: "Oasis, Casablanca", lat: 33.5600, lng: -7.6017 },
  { name: "Triangle d'Or, Casablanca", lat: 33.5900, lng: -7.6400 },
  { name: "CIL, Casablanca", lat: 33.5400, lng: -7.5800 },
  { name: "Hay Mohammadi, Casablanca", lat: 33.5917, lng: -7.5500 },
  { name: "Roches Noires, Casablanca", lat: 33.6100, lng: -7.5550 },
  { name: "2 Mars, Casablanca", lat: 33.5750, lng: -7.5650 },
  { name: "Bouskoura, Casablanca", lat: 33.4500, lng: -7.6500 },
];

const RABAT_NEIGHBORHOODS = [
  { name: "Agdal, Rabat", lat: 33.9917, lng: -6.8500 },
  { name: "Hassan, Rabat", lat: 34.0200, lng: -6.8350 },
  { name: "Océan, Rabat", lat: 34.0117, lng: -6.8617 },
  { name: "Souissi, Rabat", lat: 33.9683, lng: -6.8717 },
  { name: "Hay Riad, Rabat", lat: 33.9533, lng: -6.8833 },
  { name: "Les Orangers, Rabat", lat: 33.9983, lng: -6.8433 },
  { name: "Akkari, Rabat", lat: 34.0367, lng: -6.8300 },
  { name: "Youssoufia, Rabat", lat: 34.0083, lng: -6.8100 },
  { name: "Takaddoum, Rabat", lat: 33.9833, lng: -6.8033 },
  { name: "Yacoub El Mansour, Rabat", lat: 33.9967, lng: -6.8767 },
  { name: "Médina, Rabat", lat: 34.0283, lng: -6.8333 },
  { name: "Kasbah des Oudayas, Rabat", lat: 34.0328, lng: -6.8389 },
];

const MARRAKECH_NEIGHBORHOODS = [
  { name: "Guéliz, Marrakech", lat: 31.6350, lng: -8.0050 },
  { name: "Hivernage, Marrakech", lat: 31.6233, lng: -8.0100 },
  { name: "Médina, Marrakech", lat: 31.6295, lng: -7.9811 },
  { name: "Palmeraie, Marrakech", lat: 31.6667, lng: -7.9833 },
  { name: "Sidi Ghanem, Marrakech", lat: 31.6700, lng: -8.0483 },
  { name: "Massira, Marrakech", lat: 31.5950, lng: -7.9700 },
  { name: "Daoudiate, Marrakech", lat: 31.6450, lng: -8.0300 },
  { name: "Semlalia, Marrakech", lat: 31.6333, lng: -8.0217 },
  { name: "Targa, Marrakech", lat: 31.6500, lng: -8.0400 },
  { name: "Route de Fès, Marrakech", lat: 31.6550, lng: -7.9600 },
];

const TANGER_NEIGHBORHOODS = [
  { name: "Médina, Tanger", lat: 35.7850, lng: -5.8133 },
  { name: "Malabata, Tanger", lat: 35.8017, lng: -5.7717 },
  { name: "Iberia, Tanger", lat: 35.7700, lng: -5.8050 },
  { name: "Moujahidine, Tanger", lat: 35.7600, lng: -5.8200 },
  { name: "Mesnana, Tanger", lat: 35.7500, lng: -5.8400 },
  { name: "Boukhalef, Tanger", lat: 35.7333, lng: -5.8833 },
  { name: "Tanger City Center", lat: 35.7633, lng: -5.8100 },
  { name: "Val Fleuri, Tanger", lat: 35.7667, lng: -5.8317 },
];

const FES_NEIGHBORHOODS = [
  { name: "Fès El Bali, Fès", lat: 34.0617, lng: -4.9733 },
  { name: "Fès El Jedid, Fès", lat: 34.0517, lng: -4.9917 },
  { name: "Ville Nouvelle, Fès", lat: 34.0333, lng: -5.0100 },
  { name: "Saiss, Fès", lat: 34.0167, lng: -5.0167 },
  { name: "Route d'Immouzzer, Fès", lat: 34.0050, lng: -4.9800 },
  { name: "Narjiss, Fès", lat: 34.0450, lng: -5.0250 },
];

const AGADIR_NEIGHBORHOODS = [
  { name: "Talborjt, Agadir", lat: 30.4200, lng: -9.5983 },
  { name: "Nouveau Talborjt, Agadir", lat: 30.4150, lng: -9.5917 },
  { name: "Hay Mohammadi, Agadir", lat: 30.4400, lng: -9.5850 },
  { name: "Dakhla, Agadir", lat: 30.4050, lng: -9.5833 },
  { name: "Founty, Agadir", lat: 30.4067, lng: -9.6283 },
  { name: "Secteur Touristique, Agadir", lat: 30.4117, lng: -9.6167 },
  { name: "Sonaba, Agadir", lat: 30.4517, lng: -9.5750 },
];

const POPULAR_AREAS = [
  "Centre ville",
  "Médina",
  "Quartier industriel",
  "Zone portuaire",
  "Gare routière",
  "Aéroport",
  "Souk",
  "Zone commerciale",
  "Zone industrielle",
  "Hôpital",
  "Université",
  "Gare ferroviaire",
  "Marché central",
  "Port",
  "Stade",
];

const ALL_NEIGHBORHOODS = [
  ...CASABLANCA_NEIGHBORHOODS,
  ...RABAT_NEIGHBORHOODS,
  ...MARRAKECH_NEIGHBORHOODS,
  ...TANGER_NEIGHBORHOODS,
  ...FES_NEIGHBORHOODS,
  ...AGADIR_NEIGHBORHOODS,
];

interface Suggestion {
  text: string;
  lat?: number;
  lng?: number;
  isApi?: boolean;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectAddress,
  placeholder,
  iconColor,
  iconName,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const { isRTL, t } = useLanguage();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchNominatim = useCallback(async (query: string) => {
    if (query.length < 3) {
      setApiSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Morocco")}&limit=5&addressdetails=1&countrycodes=ma`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "FAYAGE-App/1.0",
        },
      });
      const data = await response.json();
      
      const results: Suggestion[] = data.map((item: any) => ({
        text: item.display_name.replace(", Morocco", "").replace(", Maroc", ""),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        isApi: true,
      }));
      
      setApiSuggestions(results);
    } catch (error) {
      console.error("Nominatim search error:", error);
      setApiSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        searchNominatim(value);
      }, 500);
    } else {
      setApiSuggestions([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, searchNominatim]);

  const getLocalSuggestions = useCallback(() => {
    if (!value.trim()) return [];

    const searchTerm = value.toLowerCase();
    const suggestions: Suggestion[] = [];

    ALL_NEIGHBORHOODS.forEach((neighborhood) => {
      if (neighborhood.name.toLowerCase().includes(searchTerm)) {
        suggestions.push({ text: neighborhood.name, lat: neighborhood.lat, lng: neighborhood.lng });
      }
    });

    MOROCCAN_CITIES.forEach((city) => {
      if (city.name.toLowerCase().includes(searchTerm)) {
        suggestions.push({ text: city.name, lat: city.lat, lng: city.lng });
      }

      POPULAR_AREAS.forEach((area) => {
        const fullAddress = `${area}, ${city.name}`;
        if (
          fullAddress.toLowerCase().includes(searchTerm) ||
          (area.toLowerCase().includes(searchTerm) && suggestions.length < 15)
        ) {
          if (!suggestions.find(s => s.text === fullAddress)) {
            suggestions.push({ text: fullAddress, lat: city.lat, lng: city.lng });
          }
        }
      });
    });

    return suggestions.slice(0, 8);
  }, [value]);

  const allSuggestions = [...getLocalSuggestions(), ...apiSuggestions].slice(0, 10);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    onChangeText(suggestion.text);
    if (suggestion.lat && suggestion.lng) {
      onSelectAddress(suggestion.text, { latitude: suggestion.lat, longitude: suggestion.lng });
    } else {
      onSelectAddress(suggestion.text);
    }
    setShowSuggestions(false);
    setApiSuggestions([]);
    Keyboard.dismiss();
  };

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

      const [reverseGeocode] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverseGeocode) {
        const addressParts = [
          reverseGeocode.street,
          reverseGeocode.district,
          reverseGeocode.city,
        ].filter(Boolean);
        const address = addressParts.join(", ") || t("currentLocation");
        onChangeText(address);
        onSelectAddress(address, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error("Location error:", error);
    } finally {
      setIsLoadingLocation(false);
      setShowSuggestions(false);
    }
  };

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
          <ActivityIndicator size="small" color={theme.primary} style={styles.locationButton} />
        ) : (
          <Pressable
            onPress={handleUseCurrentLocation}
            style={({ pressed }) => [
              styles.locationButton,
              {
                backgroundColor: theme.primary + "15",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            {isLoadingLocation ? (
              <ThemedText style={{ fontSize: 12 }}>...</ThemedText>
            ) : (
              <Icon name="crosshair" size={18} color={theme.primary} />
            )}
          </Pressable>
        )}
      </View>

      {showSuggestions && allSuggestions.length > 0 ? (
        <View style={[styles.suggestionsContainer, { backgroundColor: theme.backgroundDefault }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {allSuggestions.map((item, index) => (
              <Pressable
                key={`${item.text}-${index}`}
                onPress={() => handleSelectSuggestion(item)}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  {
                    backgroundColor: pressed ? theme.backgroundSecondary : "transparent",
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Icon 
                  name={item.isApi ? "globe" : "map-pin"} 
                  size={14} 
                  color={item.isApi ? theme.primary : theme.textSecondary} 
                />
                <ThemedText 
                  style={[styles.suggestionText, { textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={2}
                >
                  {item.text}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
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
    gap: Spacing.md,
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
  locationButton: {
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
    maxHeight: 250,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
});
