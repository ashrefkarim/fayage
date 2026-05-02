import React from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { RequestCard } from "@/components/RequestCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, TransportRequest } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClientTrackScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const { getClientRequests, isLoading, refreshRequests } = useRequests();

  const requests = user ? getClientRequests(user.id) : [];
  const inTransitRequests = requests.filter(
    (r) =>
      r.status === "waiting_for_payment" ||
      r.status === "paid" ||
      r.status === "accepted" ||
      r.status === "driver_arrived" ||
      r.status === "pickup" ||
      r.status === "in_transit"
  );

  const handleRequestPress = (request: TransportRequest) => {
    navigation.navigate("RequestDetails", { requestId: request.id });
  };

  const renderStatusTimeline = (request: TransportRequest) => {
    const statuses = ["waiting_for_payment", "paid", "driver_arrived", "pickup", "in_transit", "delivered"];
    // treat legacy "accepted" same as "paid"
    const normalizedStatus = request.status === "accepted" ? "paid" : request.status;
    const currentIndex = statuses.indexOf(normalizedStatus);

    const getStatusLabel = (status: string) => {
      switch (status) {
        case "waiting_for_payment": return isRTL ? "انتظار الدفع" : "Paiement";
        case "paid": return isRTL ? "مؤكد" : "Confirmé";
        case "driver_arrived": return t("driverArrived");
        case "pickup": return t("goodsPickedUp");
        case "in_transit": return t("inTransit");
        case "delivered": return t("delivered");
        default: return status;
      }
    };

    return (
      <View style={[styles.timeline, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {statuses.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <React.Fragment key={status}>
              <View style={styles.timelineStep}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: isCompleted ? theme.success : theme.border,
                      borderColor: isCurrent ? theme.success : "transparent",
                      borderWidth: isCurrent ? 3 : 0,
                    },
                  ]}
                >
                  {isCompleted && (
                    <Icon name="check" size={10} color="#FFFFFF" />
                  )}
                </View>
                <ThemedText
                  style={[
                    styles.timelineLabel,
                    { color: isCompleted ? theme.text : theme.textSecondary },
                  ]}
                >
                  {getStatusLabel(status)}
                </ThemedText>
              </View>
              {index < statuses.length - 1 && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: index < currentIndex ? theme.success : theme.border },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: TransportRequest }) => (
    <View style={[styles.trackCard, { backgroundColor: theme.backgroundDefault }]}>
      {renderStatusTimeline(item)}
      <RequestCard
        request={item}
        onPress={() => handleRequestPress(item)}
        showDriver
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-states/empty-requests.png")}
      title={t("noActiveDeliveries")}
      subtitle={t("startCreatingRequest")}
    />
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={inTransitRequests}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListEmptyComponent={renderEmpty}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshRequests} />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  trackCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  timeline: {
    padding: Spacing.lg,
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  timelineStep: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: {
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 70,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    marginTop: 11,
    marginHorizontal: -8,
  },
  separator: {
    height: Spacing.md,
  },
});
