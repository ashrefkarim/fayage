import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { Icon } from "@/components/Icon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type VerificationStatus = "pending_verification" | "verified" | "rejected";

interface DriverDocuments {
  cinFront?: string;
  selfieWithCin?: string;
  drivingLicense?: string;
  vehicleRegistration?: string;
  vehicleInsurance?: string;
}

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  vehicleType?: string;
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  documents?: DriverDocuments;
  createdAt?: string;
}

type FilterStatus = "all" | VerificationStatus;

export default function AdminVerificationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDrivers = useCallback(async () => {
    try {
      const savedUsers = await AsyncStorage.getItem("@fayage_all_users");
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      console.log("All users:", users.length);
      const driversList = users.filter((u: Driver & { role: string }) => u.role === "driver");
      console.log("Drivers found:", driversList.length);
      setDrivers(driversList);

      if (driversList.length > 0) {
        await syncDriversToBackend(driversList);
      }
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const syncDriversToBackend = async (driversList: Driver[]) => {
    try {
      const apiUrl = getApiUrl();
      await fetch(new URL("/api/admin/drivers/sync", apiUrl).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drivers: driversList }),
      });
    } catch (error) {
      console.error("Error syncing drivers:", error);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDrivers();
  };

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "all") return true;
    return driver.verificationStatus === filter;
  });

  const handleVerify = async (status: "verified" | "rejected") => {
    if (!selectedDriver) return;

    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(
        new URL(`/api/admin/drivers/${selectedDriver.id}/verify`, apiUrl).toString(),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes: verificationNotes }),
        }
      );

      if (response.ok) {
        const savedUsers = await AsyncStorage.getItem("@fayage_all_users");
        const users = savedUsers ? JSON.parse(savedUsers) : [];
        const updatedUsers = users.map((u: Driver & { role: string; isVerified: boolean }) => {
          if (u.id === selectedDriver.id) {
            return {
              ...u,
              verificationStatus: status,
              verificationNotes,
              isVerified: status === "verified",
            };
          }
          return u;
        });
        await AsyncStorage.setItem("@fayage_all_users", JSON.stringify(updatedUsers));

        setDrivers((prev) =>
          prev.map((d) =>
            d.id === selectedDriver.id
              ? { ...d, verificationStatus: status, verificationNotes }
              : d
          )
        );

        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          status === "verified" ? t("driverApproved") : t("driverRejected"),
          status === "verified"
            ? t("driverCanNowAcceptOrders")
            : t("driverHasBeenRejected")
        );
        setSelectedDriver(null);
        setVerificationNotes("");
      }
    } catch (error) {
      console.error("Error updating driver:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("error"), t("failedToUpdateDriver"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return theme.success;
      case "rejected":
        return theme.error;
      default:
        return theme.warning;
    }
  };

  const getStatusLabel = (status: VerificationStatus) => {
    switch (status) {
      case "verified":
        return t("verified");
      case "rejected":
        return t("rejected");
      default:
        return t("pending");
    }
  };

  const FilterButton = ({ status, label }: { status: FilterStatus; label: string }) => (
    <Pressable
      onPress={() => setFilter(status)}
      style={[
        styles.filterButton,
        {
          backgroundColor: filter === status ? theme.primary : theme.backgroundSecondary,
          borderColor: filter === status ? theme.primary : theme.border,
        },
      ]}
    >
      <ThemedText
        style={{
          color: filter === status ? "#FFFFFF" : theme.text,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderDriverCard = ({ item }: { item: Driver }) => {
    const handlePress = () => {
      console.log("Driver clicked:", item.fullName);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDriver(item);
      setVerificationNotes(item.verificationNotes || "");
    };

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.driverCard,
          {
            backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            padding: Spacing.lg,
            marginBottom: Spacing.md,
            borderWidth: 1,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={[styles.driverHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
            <Icon name="user" size={24} color={theme.primary} />
          </View>
          <View style={[styles.driverInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText type="subtitle">{item.fullName}</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>
              {item.phone}
            </ThemedText>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.verificationStatus) },
            ]}
          />
        </View>

        <View style={[styles.driverDetails, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.detailItem}>
            <Icon name="truck" size={14} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 4 }}>
              {item.vehicleType ? t(item.vehicleType) : "-"}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <Icon name="credit-card" size={14} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 4 }}>
              {item.nationalId || "-"}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.cardFooter, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <StatusBadge status={item.verificationStatus} />
          <Icon name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>
    );
  };

  const renderDocumentPreview = (label: string, uri?: string) => {
    if (!uri) return null;
    return (
      <View style={styles.documentItem}>
        <ThemedText style={styles.documentLabel}>{label}</ThemedText>
        <Image source={{ uri }} style={styles.documentImage} resizeMode="cover" />
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filters}>
            <FilterButton status="all" label={t("all")} />
            <FilterButton status="pending_verification" label={t("pending")} />
            <FilterButton status="verified" label={t("verified")} />
            <FilterButton status="rejected" label={t("rejected")} />
          </View>
        </ScrollView>
      </View>

      <FlatList
        data={filteredDrivers}
        keyExtractor={(item) => item.id}
        renderItem={renderDriverCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title={t("noDriversFound")}
            subtitle={t("noDriversMatchingFilter")}
          />
        }
      />

      <Modal
        visible={selectedDriver !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedDriver(null)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setSelectedDriver(null)} style={styles.closeButton}>
              <Icon name="x" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h4">{t("driverDetails")}</ThemedText>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + 100 },
            ]}
          >
            {selectedDriver ? (
              <>
                <View style={styles.driverProfileSection}>
                  <View style={[styles.largeAvatar, { backgroundColor: theme.primary + "20" }]}>
                    <Icon name="user" size={40} color={theme.primary} />
                  </View>
                  <ThemedText type="h3">{selectedDriver.fullName}</ThemedText>
                  <View style={styles.profileDetails}>
                    <ThemedText style={{ color: theme.textSecondary }}>
                      {selectedDriver.phone}
                    </ThemedText>
                    {selectedDriver.email ? (
                      <ThemedText style={{ color: theme.textSecondary }}>
                        {selectedDriver.email}
                      </ThemedText>
                    ) : null}
                  </View>
                  <StatusBadge status={selectedDriver.verificationStatus} />
                </View>

                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {t("driverInfo")}
                  </ThemedText>
                  <Card style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <ThemedText style={{ color: theme.textSecondary }}>{t("nationalId")}</ThemedText>
                      <ThemedText>{selectedDriver.nationalId || "-"}</ThemedText>
                    </View>
                    <View style={styles.infoRow}>
                      <ThemedText style={{ color: theme.textSecondary }}>{t("vehicleType")}</ThemedText>
                      <ThemedText>
                        {selectedDriver.vehicleType ? t(selectedDriver.vehicleType) : "-"}
                      </ThemedText>
                    </View>
                  </Card>
                </View>

                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {t("documents")}
                  </ThemedText>
                  <View style={styles.documentsGrid}>
                    {renderDocumentPreview(t("cinFront"), selectedDriver.documents?.cinFront)}
                    {renderDocumentPreview(t("selfieWithCin"), selectedDriver.documents?.selfieWithCin)}
                    {renderDocumentPreview(t("drivingLicense"), selectedDriver.documents?.drivingLicense)}
                    {renderDocumentPreview(t("vehicleRegistration"), selectedDriver.documents?.vehicleRegistration)}
                    {renderDocumentPreview(t("insurance"), selectedDriver.documents?.vehicleInsurance)}
                  </View>
                  {!selectedDriver.documents?.cinFront &&
                    !selectedDriver.documents?.drivingLicense ? (
                    <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                      {t("noDocumentsUploaded")}
                    </ThemedText>
                  ) : null}
                </View>

                <View style={styles.section}>
                  <ThemedText type="subtitle" style={styles.sectionTitle}>
                    {t("verificationNotes")}
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.notesInput,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    placeholder={t("addNotesPlaceholder")}
                    placeholderTextColor={theme.textSecondary}
                    value={verificationNotes}
                    onChangeText={setVerificationNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </>
            ) : null}
          </ScrollView>

          {selectedDriver ? (
            <View
              style={[
                styles.modalFooter,
                {
                  backgroundColor: theme.backgroundDefault,
                  paddingBottom: insets.bottom + Spacing.lg,
                  borderTopColor: theme.border,
                },
              ]}
            >
              {selectedDriver.verificationStatus !== "rejected" ? (
                <Pressable
                  onPress={() => handleVerify("rejected")}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.rejectButton,
                    {
                      backgroundColor: theme.error + "15",
                      borderColor: theme.error,
                      opacity: pressed || isSubmitting ? 0.7 : 1,
                    },
                  ]}
                >
                  <Icon name="x-circle" size={20} color={theme.error} />
                  <ThemedText style={{ color: theme.error, fontWeight: "600" }}>
                    {t("reject")}
                  </ThemedText>
                </Pressable>
              ) : null}
              {selectedDriver.verificationStatus !== "verified" ? (
                <Button
                  onPress={() => handleVerify("verified")}
                  disabled={isSubmitting}
                  style={styles.approveButton}
                >
                  {isSubmitting ? "..." : t("approve")}
                </Button>
              ) : (
                <ThemedText style={{ color: theme.success, textAlign: "center", flex: 1 }}>
                  {t("driverAlreadyVerified")}
                </ThemedText>
              )}
            </View>
          ) : null}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  driverCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  driverHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  driverDetails: {
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardFooter: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  driverProfileSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  profileDetails: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  infoCard: {
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  documentsGrid: {
    gap: Spacing.md,
  },
  documentItem: {
    marginBottom: Spacing.md,
  },
  documentLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  documentImage: {
    width: "100%",
    height: 150,
    borderRadius: BorderRadius.md,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 100,
    fontSize: 15,
  },
  modalFooter: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  approveButton: {
    flex: 1,
  },
});
