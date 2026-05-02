import React, { useState, useRef } from "react";
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Icon } from "@/components/Icon";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRequests } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, Shadows, Gradients } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";

type DeliveryConfirmationRouteProp = RouteProp<RootStackParamList, "DeliveryConfirmation">;

export default function DeliveryConfirmationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const route = useRoute<DeliveryConfirmationRouteProp>();
  const navigation = useNavigation();
  const { requestId } = route.params;
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { requests } = useRequests();
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const request = requests.find((r) => r.id === requestId);

  const handleTakePhoto = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(t("error"), t("cameraPermissionRequired"));
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.7,
        });
        if (photo?.base64) {
          setDeliveryPhoto(`data:image/jpeg;base64,${photo.base64}`);
          setShowCamera(false);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        Alert.alert(t("error"), t("tryAgain"));
      }
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setDeliveryPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryPhoto) {
      Alert.alert(t("error"), t("photoRequired"));
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(new URL(`/api/orders/${requestId}/complete`, getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPhoto }),
      });
      if (response.ok) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("success"), t("deliveryConfirmed"), [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error("Failed to complete delivery");
      }
    } catch {
      Alert.alert(t("error"), t("tryAgain"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (showCamera) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.cameraHeader}>
            <Pressable onPress={() => setShowCamera(false)} style={styles.closeButton}>
              <Icon name="x" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.cameraGuide}>
            <View style={[styles.guideCorner, styles.topLeft]} />
            <View style={[styles.guideCorner, styles.topRight]} />
            <View style={[styles.guideCorner, styles.bottomLeft]} />
            <View style={[styles.guideCorner, styles.bottomRight]} />
          </View>
          <View style={styles.cameraControls}>
            <ThemedText style={styles.cameraHint}>{t("takePhotoOfDeliveredGoods")}</ThemedText>
            <Pressable
              onPress={handleCapturePhoto}
              style={({ pressed }) => [styles.captureButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={styles.captureButtonInner} />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={Gradients.success as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerIcon}>
            <Icon name="camera" size={32} color="#FFFFFF" />
          </View>
          <ThemedText type="h2" style={styles.headerTitle}>
            {t("photoProofOfDelivery")}
          </ThemedText>
          <ThemedText type="body" style={styles.headerSubtitle}>
            {t("takePhotoOfDeliveredGoods")}
          </ThemedText>
        </LinearGradient>

        {/* Order info */}
        <Card style={styles.orderCard}>
          <View style={styles.orderRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.success + "20" }]}>
              <Icon name="map-pin" size={18} color={theme.success} />
            </View>
            <View style={styles.orderInfo}>
              <ThemedText type="label" style={{ color: theme.textSecondary }}>{t("pickup")}</ThemedText>
              <ThemedText type="body" numberOfLines={2}>{request.pickupAddress}</ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.orderRow}>
            <View style={[styles.iconContainer, { backgroundColor: theme.error + "20" }]}>
              <Icon name="flag" size={18} color={theme.error} />
            </View>
            <View style={styles.orderInfo}>
              <ThemedText type="label" style={{ color: theme.textSecondary }}>{t("delivery")}</ThemedText>
              <ThemedText type="body" numberOfLines={2}>{request.deliveryAddress}</ThemedText>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.priceRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>{t("totalPrice")}</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
              <ThemedText type="h3" style={{ color: theme.primary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {request.finalPrice || request.proposedPrice}
              </ThemedText>
              <ThemedText style={{ color: theme.primary, fontSize: 13, fontWeight: "600", paddingBottom: 2 }}>MAD</ThemedText>
            </View>
          </View>
        </Card>

        {/* Photo capture */}
        <Card style={styles.photoCard}>
          {deliveryPhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: deliveryPhoto }} style={styles.photoPreview} />
              <Pressable
                onPress={() => setDeliveryPhoto(null)}
                style={[styles.removePhotoButton, { backgroundColor: theme.error }]}
              >
                <Icon name="x" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable
                onPress={handleTakePhoto}
                style={({ pressed }) => [styles.photoButton, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Icon name="camera" size={32} color="#FFFFFF" />
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", marginTop: Spacing.sm }}>{t("takePhoto")}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handlePickFromGallery}
                style={({ pressed }) => [styles.photoButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1, opacity: pressed ? 0.8 : 1 }]}
              >
                <Icon name="image" size={32} color={theme.primary} />
                <ThemedText style={{ color: theme.text, fontWeight: "600", marginTop: Spacing.sm }}>{t("chooseFromGallery")}</ThemedText>
              </Pressable>
            </View>
          )}
        </Card>

        <Button onPress={handleConfirmDelivery} disabled={!deliveryPhoto || isSubmitting} style={styles.confirmButton}>
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>{t("confirmDelivery")}</ThemedText>
          )}
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  headerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.md,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  headerTitle: { color: "#FFFFFF", marginBottom: Spacing.xs },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", textAlign: "center" },
  orderCard: { gap: Spacing.md },
  orderRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orderInfo: { flex: 1 },
  divider: { height: 1, marginVertical: Spacing.xs },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  photoCard: { padding: 0, overflow: "hidden" },
  photoButtons: { flexDirection: "row", gap: Spacing.md, padding: Spacing.md },
  photoButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    minHeight: 120,
  },
  photoPreviewContainer: { position: "relative" },
  photoPreview: { width: "100%", height: 200 },
  removePhotoButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: { marginTop: Spacing.md },
  camera: { flex: 1 },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  cameraHeader: { padding: Spacing.lg },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraGuide: {
    width: 200,
    height: 200,
    alignSelf: "center",
  },
  guideCorner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraControls: { alignItems: "center", padding: Spacing.xl, gap: Spacing.lg },
  cameraHint: { color: "#FFFFFF", textAlign: "center", fontWeight: "600" },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
  },
});
