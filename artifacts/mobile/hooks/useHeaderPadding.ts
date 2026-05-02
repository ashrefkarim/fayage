import { Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

/**
 * On iOS the stack header is transparent (content starts at y=0 behind the header),
 * so screens must add paddingTop = headerHeight to push content below it.
 * On Android the header is opaque, React Navigation positions content below it
 * automatically, so no extra padding is needed (returns 0).
 */
export function useHeaderPadding(): number {
  const headerHeight = useHeaderHeight();
  return Platform.OS === "ios" ? headerHeight : 0;
}
