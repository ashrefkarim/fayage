import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

type IconName =
  | "map-pin"
  | "navigation"
  | "truck"
  | "package"
  | "dollar-sign"
  | "clock"
  | "calendar"
  | "user"
  | "phone"
  | "mail"
  | "message-circle"
  | "star"
  | "check"
  | "check-circle"
  | "x"
  | "x-circle"
  | "alert-circle"
  | "info"
  | "help-circle"
  | "edit"
  | "edit-2"
  | "edit-3"
  | "trash"
  | "trash-2"
  | "plus"
  | "minus"
  | "chevron-right"
  | "chevron-left"
  | "chevron-up"
  | "chevron-down"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "home"
  | "settings"
  | "log-out"
  | "camera"
  | "image"
  | "upload"
  | "download"
  | "file"
  | "file-text"
  | "folder"
  | "search"
  | "filter"
  | "refresh-cw"
  | "eye"
  | "eye-off"
  | "lock"
  | "unlock"
  | "shield"
  | "award"
  | "trending-up"
  | "trending-down"
  | "bar-chart"
  | "pie-chart"
  | "activity"
  | "heart"
  | "bookmark"
  | "bell"
  | "globe"
  | "map"
  | "compass"
  | "credit-card"
  | "briefcase"
  | "clipboard"
  | "list"
  | "grid"
  | "menu"
  | "more-horizontal"
  | "more-vertical"
  | "share"
  | "send"
  | "zap"
  | "sun"
  | "moon"
  | "wifi"
  | "wifi-off"
  | "flag"
  | "external-link"
  | "crosshair"
  | "fast-forward"
  | "arrow-up-circle"
  | "maximize"
  | "gift"
  | "share-2"
  | "copy"
  | "users"
  | "phone-call"
  | "phone-off"
  | "phone-incoming"
  | "phone-missed"
  | "volume-2"
  | "volume-x"
  | "mic"
  | "mic-off";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

const iconSymbols: Record<IconName, string> = {
  "map-pin": "📍",
  navigation: "🧭",
  truck: "🚚",
  package: "📦",
  "dollar-sign": "💵",
  clock: "🕐",
  calendar: "📅",
  user: "👤",
  phone: "📞",
  mail: "✉️",
  "message-circle": "💬",
  star: "★",
  check: "✓",
  "check-circle": "✓",
  x: "✕",
  "x-circle": "✕",
  "alert-circle": "⚠",
  info: "ℹ",
  "help-circle": "?",
  edit: "✎",
  "edit-2": "✎",
  "edit-3": "✎",
  trash: "🗑",
  "trash-2": "🗑",
  plus: "+",
  minus: "−",
  "chevron-right": "›",
  "chevron-left": "‹",
  "chevron-up": "^",
  "chevron-down": "v",
  "arrow-right": "→",
  "arrow-left": "←",
  "arrow-up": "↑",
  "arrow-down": "↓",
  home: "🏠",
  settings: "⚙",
  "log-out": "↪",
  camera: "📷",
  image: "🖼",
  upload: "↑",
  download: "↓",
  file: "📄",
  "file-text": "📄",
  folder: "📁",
  search: "🔍",
  filter: "⚙",
  "refresh-cw": "↻",
  eye: "👁",
  "eye-off": "⊘",
  lock: "🔒",
  unlock: "🔓",
  shield: "🛡",
  award: "🏆",
  "trending-up": "📈",
  "trending-down": "📉",
  "bar-chart": "📊",
  "pie-chart": "📊",
  activity: "📈",
  heart: "♥",
  bookmark: "🔖",
  bell: "🔔",
  globe: "🌐",
  map: "🗺",
  compass: "🧭",
  "credit-card": "💳",
  briefcase: "💼",
  clipboard: "📋",
  list: "☰",
  grid: "⊞",
  menu: "☰",
  "more-horizontal": "⋯",
  "more-vertical": "⋮",
  share: "↗",
  send: "➤",
  zap: "⚡",
  sun: "☀",
  moon: "☽",
  wifi: "📶",
  "wifi-off": "📵",
  flag: "🚩",
  "external-link": "↗",
  crosshair: "⊕",
  "fast-forward": "⏩",
  "arrow-up-circle": "⬆",
  maximize: "⛶",
  gift: "🎁",
  "share-2": "↗",
  copy: "📋",
  users: "👥",
  "phone-call": "📞",
  "phone-off": "📵",
  "phone-incoming": "📲",
  "phone-missed": "📵",
  "volume-2": "🔊",
  "volume-x": "🔇",
  mic: "🎤",
  "mic-off": "🎤",
};

export function Icon({ name, size = 24, color = "#000", style }: IconProps) {
  if (Platform.OS === "android") {
    const symbol = iconSymbols[name] || "•";
    return (
      <View style={[styles.container, { width: size, height: size }, style]}>
        <Text
          style={[
            styles.symbol,
            {
              fontSize: size * 0.75,
              color,
              lineHeight: size,
            },
          ]}
        >
          {symbol}
        </Text>
      </View>
    );
  }

  return (
    <Feather
      name={name as any}
      size={size}
      color={color}
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: {
    textAlign: "center",
  },
});

export type { IconName };
