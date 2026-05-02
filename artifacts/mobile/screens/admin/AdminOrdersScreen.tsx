import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  vehicleType: string;
  proposedPrice: number;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  awaiting_client_approval: "#8B5CF6",
  accepted: "#3B82F6",
  waiting_for_payment: "#F97316",
  paid: "#06B6D4",
  driver_arrived: "#06B6D4",
  pickup: "#10B981",
  in_transit: "#6366F1",
  delivered: "#22C55E",
  completed: "#16A34A",
  cancelled: "#EF4444",
};

export default function AdminOrdersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const statusFilters = [
    { key: null, label: t("all") || "Tous" },
    { key: "pending", label: t("pending") },
    { key: "accepted", label: t("accepted") },
    { key: "in_transit", label: t("inTransit") },
    { key: "delivered", label: t("delivered") },
    { key: "cancelled", label: t("cancelled") },
  ];

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/api/orders`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    let filtered = orders;

    if (selectedStatus) {
      filtered = filtered.filter((order) => order.status === selectedStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.id.toLowerCase().includes(query) ||
          order.clientName?.toLowerCase().includes(query) ||
          order.clientPhone?.includes(query) ||
          order.driverName?.toLowerCase().includes(query) ||
          order.driverPhone?.includes(query) ||
          order.pickupAddress?.toLowerCase().includes(query) ||
          order.deliveryAddress?.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, selectedStatus]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t("pending"),
      awaiting_client_approval: t("awaitingApproval") || "En attente",
      accepted: t("accepted"),
      driver_arrived: t("driverArrived"),
      pickup: t("goodsPickedUp"),
      in_transit: t("inTransit"),
      delivered: t("delivered"),
      cancelled: t("cancelled"),
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <Card elevation={1} style={styles.orderCard}>
      <View style={[styles.orderHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.orderIdContainer}>
          <ThemedText style={[styles.orderId, { color: theme.textSecondary }]}>
            #{item.id.slice(0, 8)}
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: (STATUS_COLORS[item.status] || theme.textSecondary) + "20" },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLORS[item.status] || theme.textSecondary },
              ]}
            />
            <ThemedText
              style={[
                styles.statusText,
                { color: STATUS_COLORS[item.status] || theme.textSecondary },
              ]}
            >
              {getStatusLabel(item.status)}
            </ThemedText>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
          <ThemedText style={[styles.price, { color: theme.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {item.proposedPrice}
          </ThemedText>
          <ThemedText style={{ color: theme.primary, fontSize: 12, fontWeight: "600", paddingBottom: 2 }}>
            MAD
          </ThemedText>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Icon name="user" size={14} color={theme.textSecondary} />
          <ThemedText style={[styles.infoText, { textAlign: isRTL ? "right" : "left" }]}>
            {item.clientName} - {item.clientPhone}
          </ThemedText>
        </View>

        {item.driverName ? (
          <View style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Icon name="truck" size={14} color={theme.success} />
            <ThemedText style={[styles.infoText, { color: theme.success, textAlign: isRTL ? "right" : "left" }]}>
              {item.driverName} - {item.driverPhone}
            </ThemedText>
          </View>
        ) : null}

        <View style={[styles.addressRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.addressDots}>
            <View style={[styles.dot, { backgroundColor: theme.success }]} />
            <View style={[styles.line, { backgroundColor: theme.border }]} />
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          </View>
          <View style={[styles.addresses, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {item.pickupAddress}
            </ThemedText>
            <ThemedText style={styles.addressText} numberOfLines={1}>
              {item.deliveryAddress}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.vehicleBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Icon name="package" size={12} color={theme.textSecondary} />
            <ThemedText style={[styles.vehicleText, { color: theme.textSecondary }]}>
              {item.vehicleType}
            </ThemedText>
          </View>
          <ThemedText style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="package" size={48} color={theme.textSecondary} />
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchQuery ? (t("noResultsFound") || "Aucun résultat") : (t("noOrders") || "Aucune commande")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.searchContainer,
          {
            paddingTop: headerHeight + Spacing.md,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.backgroundSecondary,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Icon name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.text, textAlign: isRTL ? "right" : "left" },
            ]}
            placeholder={t("searchOrders") || "Rechercher..."}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Icon name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.key || "all"}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedStatus(item.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedStatus === item.key
                      ? theme.primary
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterText,
                  {
                    color:
                      selectedStatus === item.key ? "#FFFFFF" : theme.text,
                  },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchOrders} />
        }
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchBar: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  filtersContainer: {
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  orderCard: {
    padding: Spacing.md,
  },
  orderHeader: {
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  orderIdContainer: {
    gap: Spacing.xs,
  },
  orderId: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
  },
  orderBody: {
    gap: Spacing.sm,
  },
  infoRow: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  addressRow: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addressDots: {
    alignItems: "center",
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    height: 16,
  },
  addresses: {
    flex: 1,
    gap: Spacing.sm,
  },
  addressText: {
    fontSize: 13,
  },
  footer: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  vehicleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  vehicleText: {
    fontSize: 11,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 11,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
  },
});
