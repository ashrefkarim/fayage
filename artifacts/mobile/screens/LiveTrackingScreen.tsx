import { Platform } from "react-native";

const LiveTrackingScreen = Platform.select({
  native: () => require("./LiveTrackingScreen.native").default,
  default: () => require("./LiveTrackingScreen.web").default,
})();

export default LiveTrackingScreen;
