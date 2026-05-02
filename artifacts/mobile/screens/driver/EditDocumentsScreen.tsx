import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Image, Pressable, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, DriverDocuments } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

async function convertToBase64(uri: string | undefined): Promise<string | undefined> {
  if (!uri) return undefined;
  if (uri.startsWith("data:")) return uri;
  
  try {
    // Handle blob URLs on web
    if (Platform.OS === "web" && uri.startsWith("blob:")) {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    
    // For native platforms, use FileSystem
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = ext === "png" ? "image/png" : "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return undefined;
  }
}

interface DocumentItem {
  key: keyof DriverDocuments;
  label: string;
}

export default function EditDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();

  const [documents, setDocuments] = useState<DriverDocuments>(user?.documents || {});
  const [isLoading, setIsLoading] = useState(false);

  const documentItems: DocumentItem[] = [
    { key: "cinFront", label: t("cinFront") },
    { key: "cinBack", label: t("cinBack") },
    { key: "selfieWithCin", label: t("selfieWithCin") },
    { key: "drivingLicenseFront", label: t("drivingLicenseFront") },
    { key: "drivingLicenseBack", label: t("drivingLicenseBack") },
    { key: "vehicleRegistrationFront", label: t("vehicleRegistrationFront") },
    { key: "vehicleRegistrationBack", label: t("vehicleRegistrationBack") },
    { key: "vehicleInsurance", label: t("vehicleInsurance") },
  ];

  const pickImage = async (docKey: keyof DriverDocuments) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setDocuments(prev => ({ ...prev, [docKey]: uri }));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const documentsBase64: DriverDocuments = {};
      for (const item of documentItems) {
        const value = documents[item.key];
        if (value) {
          documentsBase64[item.key] = await convertToBase64(value);
        }
      }

      const response = await fetch(new URL(`/api/drivers/${user.id}/documents`, getApiUrl()).toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: documentsBase64 }),
      });

      if (response.ok) {
        await updateUser({ 
          documents, 
          verificationStatus: "pending_verification",
          rejectionReason: undefined,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("success"), t("documentsUpdatedSuccess"), [
          { text: t("ok"), onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error("Failed to update documents");
      }
    } catch (error) {
      console.error("Error updating documents:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("documentsUpdateError"));
    } finally {
      setIsLoading(false);
    }
  };

  const renderDocumentItem = (item: DocumentItem) => {
    const hasImage = !!documents[item.key];
    
    return (
      <Card key={item.key} style={styles.documentCard}>
        <Pressable
          style={styles.documentPressable}
          onPress={() => pickImage(item.key)}
        >
          <View style={styles.documentContent}>
            <View style={[styles.thumbnailContainer, { backgroundColor: theme.backgroundElevated }]}>
              {hasImage ? (
                <Image source={{ uri: documents[item.key] }} style={styles.thumbnail} />
              ) : (
                <Icon name="image" size={24} color={theme.textSecondary} />
              )}
            </View>
            <View style={styles.documentInfo}>
              <ThemedText style={styles.documentLabel}>{item.label}</ThemedText>
              <ThemedText style={[styles.documentStatus, { color: hasImage ? theme.success : theme.warning }]}>
                {hasImage ? t("uploaded") : t("notUploaded")}
              </ThemedText>
            </View>
          </View>
          <Icon name="edit-2" size={20} color={theme.primary} />
        </Pressable>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h3">{t("updateDocuments")}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("updateDocumentsDescription")}
          </ThemedText>
        </View>

        <View style={styles.documentsList}>
          {documentItems.map(renderDocumentItem)}
        </View>

        <Button
          title={t("submitForReview")}
          onPress={handleSubmit}
          loading={isLoading}
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  documentsList: {
    gap: Spacing.md,
  },
  documentCard: {
    padding: 0,
    overflow: "hidden",
  },
  documentPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  documentContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  documentInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  documentStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
});
