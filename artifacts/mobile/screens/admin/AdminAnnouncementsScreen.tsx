import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Switch,
} from "react-native";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  info: "#3B82F6",
  warning: "#F59E0B",
  urgent: "#EF4444",
};

export default function AdminAnnouncementsScreen() {
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "urgent">("info");
  const [targetAudience, setTargetAudience] = useState<"all" | "clients" | "drivers">("all");
  const [isActive, setIsActive] = useState(true);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState("7");

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(new URL("api/announcements", getApiUrl()).toString());
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.announcements || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setType("info");
    setTargetAudience("all");
    setIsActive(true);
    setHasExpiration(false);
    setExpirationDays("7");
    setEditingAnnouncement(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setType(announcement.type as "info" | "warning" | "urgent");
    setTargetAudience(announcement.targetAudience as "all" | "clients" | "drivers");
    setIsActive(announcement.isActive);
    if (announcement.expiresAt) {
      setHasExpiration(true);
      const days = Math.ceil((new Date(announcement.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      setExpirationDays(String(Math.max(1, days)));
    } else {
      setHasExpiration(false);
      setExpirationDays("7");
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) return;

    const expiresAt = hasExpiration 
      ? new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      const url = editingAnnouncement
        ? new URL(`api/announcements/${editingAnnouncement.id}`, getApiUrl()).toString()
        : new URL("api/announcements", getApiUrl()).toString();
      
      const method = editingAnnouncement ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          targetAudience,
          isActive,
          expiresAt,
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchAnnouncements();
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(new URL(`api/announcements/${id}`, getApiUrl()).toString(), {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteConfirmId(null);
        fetchAnnouncements();
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const response = await fetch(new URL(`api/announcements/${announcement.id}`, getApiUrl()).toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...announcement,
          isActive: !announcement.isActive,
        }),
      });

      if (response.ok) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error("Failed to toggle announcement:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "all": return t("audienceAll");
      case "clients": return t("audienceClients");
      case "drivers": return t("audienceDrivers");
      default: return audience;
    }
  };

  const getTypeLabel = (announcementType: string) => {
    switch (announcementType) {
      case "info": return t("announcementInfo");
      case "warning": return t("announcementWarning");
      case "urgent": return t("announcementUrgent");
      default: return announcementType;
    }
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => {
    const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.info;
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();

    return (
      <Card style={[styles.card, !item.isActive && styles.inactiveCard]}>
        {deleteConfirmId === item.id ? (
          <View style={styles.deleteConfirmContainer}>
            <ThemedText style={styles.deleteConfirmText}>
              {t("confirmDeleteAnnouncement")}
            </ThemedText>
            <View style={styles.deleteConfirmButtons}>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: "#EF4444" }]}
                onPress={() => handleDelete(item.id)}
              >
                <ThemedText style={styles.confirmButtonText}>{t("delete")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmButton, { backgroundColor: theme.border }]}
                onPress={() => setDeleteConfirmId(null)}
              >
                <ThemedText style={styles.confirmButtonText}>{t("cancel")}</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.cardHeader, isRTL && styles.rtlRow]}>
              <View style={[styles.typeIndicator, { backgroundColor: typeColor }]}>
                <Icon name={item.type === "urgent" ? "alert-circle" : item.type === "warning" ? "alert-triangle" : "info"} size={14} color="#FFFFFF" />
                <ThemedText style={styles.typeLabel}>{getTypeLabel(item.type)}</ThemedText>
              </View>
              <View style={[styles.headerActions, isRTL && styles.rtlRow]}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleActive(item)}
                >
                  <Icon 
                    name={item.isActive ? "eye" : "eye-off"} 
                    size={18} 
                    color={item.isActive ? "#22C55E" : theme.textSecondary} 
                  />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => openEditModal(item)}
                >
                  <Icon name="edit-2" size={18} color={theme.primary} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => setDeleteConfirmId(item.id)}
                >
                  <Icon name="trash-2" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>

            <ThemedText style={styles.cardTitle}>{item.title}</ThemedText>
            <ThemedText style={[styles.cardMessage, { color: theme.textSecondary }]}>
              {item.message}
            </ThemedText>

            <View style={[styles.cardFooter, isRTL && styles.rtlRow]}>
              <View style={[styles.audienceBadge, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name="users" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.audienceText, { color: theme.textSecondary }]}>
                  {getAudienceLabel(item.targetAudience)}
                </ThemedText>
              </View>
              <ThemedText style={[styles.dateText, { color: theme.textSecondary }]}>
                {formatDate(item.createdAt)}
              </ThemedText>
            </View>

            {isExpired ? (
              <View style={[styles.expiredBadge, { backgroundColor: "#FEE2E2" }]}>
                <Icon name="clock" size={12} color="#EF4444" />
                <ThemedText style={styles.expiredText}>Expiré</ThemedText>
              </View>
            ) : item.expiresAt ? (
              <View style={[styles.expirationInfo, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name="clock" size={12} color={theme.textSecondary} />
                <ThemedText style={[styles.expirationText, { color: theme.textSecondary }]}>
                  {t("expiresAt")}: {formatDate(item.expiresAt)}
                </ThemedText>
              </View>
            ) : null}
          </>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t("noAnnouncements")}
      </ThemedText>
    </View>
  );

  const renderTypeOption = (optionType: "info" | "warning" | "urgent") => {
    const isSelected = type === optionType;
    const color = TYPE_COLORS[optionType];
    
    return (
      <Pressable
        key={optionType}
        style={[
          styles.typeOption,
          isSelected && { backgroundColor: color, borderColor: color },
          { borderColor: theme.border },
        ]}
        onPress={() => setType(optionType)}
      >
        <Icon name={optionType === "urgent" ? "alert-circle" : optionType === "warning" ? "alert-triangle" : "info"} size={16} color={isSelected ? "#FFFFFF" : color} />
        <ThemedText style={[styles.typeOptionText, isSelected && { color: "#FFFFFF" }]}>
          {getTypeLabel(optionType)}
        </ThemedText>
      </Pressable>
    );
  };

  const renderAudienceOption = (audience: "all" | "clients" | "drivers") => {
    const isSelected = targetAudience === audience;
    
    return (
      <Pressable
        key={audience}
        style={[
          styles.audienceOption,
          isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
          { borderColor: theme.border },
        ]}
        onPress={() => setTargetAudience(audience)}
      >
        <ThemedText style={[styles.audienceOptionText, isSelected && { color: "#FFFFFF" }]}>
          {getAudienceLabel(audience)}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        renderItem={renderAnnouncement}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchAnnouncements} />
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.lg }]}
        onPress={openCreateModal}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHeader, isRTL && styles.rtlRow]}>
              <ThemedText style={styles.modalTitle}>
                {editingAnnouncement ? t("editAnnouncement") : t("newAnnouncement")}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Icon name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.label}>{t("announcementTitle")}</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t("enterTitle")}
                placeholderTextColor={theme.textSecondary}
                value={title}
                onChangeText={setTitle}
                textAlign={isRTL ? "right" : "left"}
              />

              <ThemedText style={styles.label}>{t("announcementMessage")}</ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder={t("enterMessage")}
                placeholderTextColor={theme.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                textAlign={isRTL ? "right" : "left"}
              />

              <ThemedText style={styles.label}>{t("announcementType")}</ThemedText>
              <View style={[styles.optionsRow, isRTL && styles.rtlRow]}>
                {renderTypeOption("info")}
                {renderTypeOption("warning")}
                {renderTypeOption("urgent")}
              </View>

              <ThemedText style={styles.label}>{t("targetAudience")}</ThemedText>
              <View style={[styles.optionsRow, isRTL && styles.rtlRow]}>
                {renderAudienceOption("all")}
                {renderAudienceOption("clients")}
                {renderAudienceOption("drivers")}
              </View>

              <View style={[styles.switchRow, isRTL && styles.rtlRow]}>
                <ThemedText style={styles.switchLabel}>{t("isActive")}</ThemedText>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              <View style={[styles.switchRow, isRTL && styles.rtlRow]}>
                <ThemedText style={styles.switchLabel}>{t("expiresAt")}</ThemedText>
                <Switch
                  value={hasExpiration}
                  onValueChange={setHasExpiration}
                  trackColor={{ false: theme.border, true: theme.primary }}
                />
              </View>

              {hasExpiration ? (
                <View style={styles.expirationInput}>
                  <TextInput
                    style={[styles.daysInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                    value={expirationDays}
                    onChangeText={setExpirationDays}
                    keyboardType="number-pad"
                    textAlign="center"
                  />
                  <ThemedText style={{ color: theme.textSecondary }}>jours</ThemedText>
                </View>
              ) : null}

              <Pressable
                style={[styles.saveButton, { backgroundColor: theme.primary, opacity: (!title.trim() || !message.trim()) ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={!title.trim() || !message.trim()}
              >
                <ThemedText style={styles.saveButtonText}>
                  {editingAnnouncement ? t("save") : t("createAnnouncement")}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  typeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  typeLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  cardMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  audienceText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  expirationInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    alignSelf: "flex-start",
  },
  expirationText: {
    fontSize: 12,
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
    alignSelf: "flex-start",
  },
  expiredText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  deleteConfirmContainer: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  deleteConfirmText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  deleteConfirmButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  confirmButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.xl * 3,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  rtlRow: {
    flexDirection: "row-reverse",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    minHeight: 100,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 4,
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  audienceOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  audienceOptionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  expirationInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  daysInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    width: 80,
  },
  saveButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
