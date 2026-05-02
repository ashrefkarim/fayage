import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    buttonText: "#FFFFFF",
    tabIconDefault: "#64748B",
    tabIconSelected: "#1E3A8A",
    link: "#3B82F6",
    primary: "#1E3A8A",
    primaryLight: "#3B82F6",
    secondary: "#D97706",
    secondaryLight: "#F59E0B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    border: "#E2E8F0",
    backgroundRoot: "#F8FAFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F1F5F9",
    backgroundTertiary: "#E2E8F0",
    verifiedBadge: "#D97706",
    shadow: "rgba(15, 23, 42, 0.08)",
    overlay: "rgba(15, 23, 42, 0.5)",
    gold: "#F59E0B",
  },
  dark: {
    text: "#F1F5F9",
    textSecondary: "#94A3B8",
    buttonText: "#FFFFFF",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#60A5FA",
    link: "#60A5FA",
    primary: "#3B82F6",
    primaryLight: "#60A5FA",
    secondary: "#F59E0B",
    secondaryLight: "#FBBF24",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    border: "#334155",
    backgroundRoot: "#0F172A",
    backgroundDefault: "#1E293B",
    backgroundSecondary: "#334155",
    backgroundTertiary: "#475569",
    verifiedBadge: "#F59E0B",
    shadow: "rgba(0, 0, 0, 0.3)",
    overlay: "rgba(0, 0, 0, 0.6)",
    gold: "#FBBF24",
  },
};

export const Gradients = {
  primary: ["#1E3A8A", "#3B82F6"],
  accent: ["#D97706", "#F59E0B"],
  premium: ["#1E3A8A", "#2563EB", "#3B82F6"],
  gold: ["#D97706", "#F59E0B", "#FBBF24"],
  dark: ["#0F172A", "#1E293B"],
  success: ["#059669", "#10B981"],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 52,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "600" as const,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "600" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "500" as const,
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Fonts = {
  heading: "Poppins_600SemiBold",
  headingMedium: "Poppins_500Medium",
  body: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
  bodyMedium: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),
};

export const VehicleTypes = [
  { id: "fourgon", icon: "truck", labelEn: "Fourgon", labelFr: "Fourgon", labelAr: "فورغون", capacityFr: "1 – 3 tonnes", capacityAr: "١ – ٣ طن" },
  { id: "camion_7t", icon: "truck", labelEn: "Camion 7T", labelFr: "Camion 7 tonnes", labelAr: "شاحنة 7 طن", capacityFr: "≈ 7 tonnes", capacityAr: "≈ ٧ طن" },
  { id: "camion_14t", icon: "truck", labelEn: "Camion 14T", labelFr: "Camion 14 tonnes", labelAr: "شاحنة 14 طن", capacityFr: "≈ 14 tonnes", capacityAr: "≈ ١٤ طن" },
  { id: "camion_19t", icon: "truck", labelEn: "Camion 19T", labelFr: "Camion 19 tonnes", labelAr: "شاحنة 19 طن", capacityFr: "≈ 19 tonnes", capacityAr: "≈ ١٩ طن" },
  { id: "semi_remorque", icon: "truck", labelEn: "Semi-remorque", labelFr: "Semi-remorque", labelAr: "نصف مقطورة", capacityFr: "24 – 34 tonnes", capacityAr: "٢٤ – ٣٤ طن" },
  { id: "train_routier", icon: "truck", labelEn: "Train routier", labelFr: "Train routier", labelAr: "قطار طرقي", capacityFr: "jusqu'à 40 t", capacityAr: "حتى ٤٠ طن" },
  { id: "camion_benne", icon: "truck", labelEn: "Camion benne", labelFr: "Camion benne", labelAr: "شاحنة قلابة", capacityFr: "Sable · Gravier", capacityAr: "رمل · حصى" },
  { id: "camion_citerne", icon: "truck", labelEn: "Camion citerne", labelFr: "Camion citerne", labelAr: "شاحنة صهريج", capacityFr: "Liquides", capacityAr: "سوائل" },
] as const;

export const DeliveryOptions = [
  { id: "standard", labelEn: "Standard", labelFr: "Standard", labelAr: "عادي", multiplier: 1 },
  { id: "urgent", labelEn: "Urgent", labelFr: "Urgent", labelAr: "عاجل", multiplier: 1.5 },
  { id: "express", labelEn: "Express", labelFr: "Express", labelAr: "سريع", multiplier: 2 },
] as const;
