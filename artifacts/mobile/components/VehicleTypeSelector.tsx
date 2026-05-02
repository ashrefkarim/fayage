import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { VehicleTypes, BorderRadius, Spacing } from "@/constants/theme";

interface VehicleTypeSelectorProps {
  selected: string;
  onSelect: (type: string) => void;
}

export function VehicleTypeSelector({ selected, onSelect }: VehicleTypeSelectorProps) {
  const { theme } = useTheme();
  const { language, isRTL } = useLanguage();

  const getLabel = (vehicle: typeof VehicleTypes[number]) => {
    if (language === "ar") return vehicle.labelAr;
    return vehicle.labelFr;
  };

  const getCapacity = (vehicle: typeof VehicleTypes[number]) => {
    if (language === "ar") return vehicle.capacityAr;
    return vehicle.capacityFr;
  };

  const rows: (typeof VehicleTypes[number])[][] = [];
  for (let i = 0; i < VehicleTypes.length; i += 2) {
    rows.push(VehicleTypes.slice(i, i + 2) as unknown as (typeof VehicleTypes[number])[]);
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {row.map((vehicle) => {
            const isSelected = selected === vehicle.id;
            return (
              <Pressable
                key={vehicle.id}
                onPress={() => onSelect(vehicle.id)}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.backgroundDefault,
                    borderColor: isSelected ? theme.primary : theme.border,
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Icon
                  name="truck"
                  size={22}
                  color={isSelected ? "#FFFFFF" : theme.primary}
                />
                <ThemedText
                  style={[
                    styles.label,
                    { color: isSelected ? "#FFFFFF" : theme.text, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {getLabel(vehicle)}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.capacity,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {getCapacity(vehicle)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  capacity: {
    fontSize: 11,
    fontWeight: "400",
  },
});
