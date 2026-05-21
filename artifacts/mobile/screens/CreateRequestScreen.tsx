import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Modal, ScrollView, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { VehicleTypeSelector } from "@/components/VehicleTypeSelector";
import { DeliveryOptionSelector } from "@/components/DeliveryOptionSelector";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import MapPickerModal from "@/components/MapPickerModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRequests, LocationCoordinates } from "@/contexts/RequestsContext";
import { BorderRadius, Spacing, DeliveryOptions, VehicleTypes } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

export default function CreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();
  const { createRequest } = useRequests();

  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<LocationCoordinates | undefined>();
  const [deliveryCoords, setDeliveryCoords] = useState<LocationCoordinates | undefined>();
  const [vehicleType, setVehicleType] = useState("van");
  const [goodsDescription, setGoodsDescription] = useState("");
  const [estimatedWeight, setEstimatedWeight] = useState("50");
  const [weightUnit, setWeightUnit] = useState<"kg" | "tn">("kg");
  const [deliveryOption, setDeliveryOption] = useState("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [favoriteDrivers, setFavoriteDrivers] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>();
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [viaCashPlusWafaCash, setViaCashPlusWafaCash] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mapPickerTarget, setMapPickerTarget] = useState<"pickup" | "delivery" | null>(null);

  useEffect(() => {
    if (user) {
      fetchFavoriteDrivers();
    }
  }, [user]);

  const fetchFavoriteDrivers = async () => {
    if (!user) return;
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/clients/${user.id}/favorites`);
      const result = await response.json();
      if (result.success) {
        setFavoriteDrivers(result.favorites.filter((f: any) => f.driver));
      }
    } catch (error) {
      console.error("Error fetching favorite drivers:", error);
    }
  };

  const [clientPrice, setClientPrice] = useState("");

  const handleSubmit = async () => {
    if (!user || !pickupAddress || !deliveryAddress || !goodsDescription) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      const price = parseInt(clientPrice) || 0;
      await createRequest({
        clientId: user.id,
        clientName: user.fullName,
        clientPhone: user.phone,
        clientRating: user.rating,
        pickupAddress,
        deliveryAddress,
        pickupCoords,
        deliveryCoords,
        vehicleType,
        goodsDescription,
        estimatedWeight: Math.round((parseFloat(estimatedWeight) || 50) * (weightUnit === "tn" ? 1000 : 1)),
        deliveryOption: deliveryOption as "standard" | "urgent" | "express",
        proposedPrice: price,
        scheduledFor: isScheduled ? scheduledDate : undefined,
        preferredDriverId: selectedDriverId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Error creating request:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const weightStep = weightUnit === "tn" ? 0.5 : 10;
  const weightMin = weightUnit === "tn" ? 0.5 : 10;
  const weightMax = weightUnit === "tn" ? 100 : 100000;

  const incrementWeight = () => {
    const current = parseFloat(estimatedWeight) || 0;
    const next = Math.min(current + weightStep, weightMax);
    setEstimatedWeight(weightUnit === "tn" ? String(next) : String(Math.round(next)));
  };

  const decrementWeight = () => {
    const current = parseFloat(estimatedWeight) || 0;
    const next = Math.max(current - weightStep, weightMin);
    setEstimatedWeight(weightUnit === "tn" ? String(next) : String(Math.round(next)));
  };

  const handleSwitchUnit = (unit: "kg" | "tn") => {
    if (unit === weightUnit) return;
    const current = parseFloat(estimatedWeight) || 0;
    if (unit === "tn") {
      const inTn = Math.max(0.5, current / 1000);
      setEstimatedWeight(String(Math.round(inTn * 10) / 10));
    } else {
      const inKg = Math.max(10, Math.round(current * 1000));
      setEstimatedWeight(String(inKg));
    }
    setWeightUnit(unit);
  };


  const canProceedToConfirmation = () => {
    return pickupAddress && deliveryAddress && goodsDescription && clientPrice.trim() !== "" && parseInt(clientPrice) > 0;
  };

  const handleProceedToConfirmation = async () => {
    if (!canProceedToConfirmation()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setShowConfirmation(true);
  };

  const getVehicleLabel = () => {
    const vehicle = VehicleTypes.find((v) => v.id === vehicleType);
    if (!vehicle) return vehicleType;
    return isRTL ? vehicle.labelAr : vehicle.labelFr;
  };

  const getDeliveryLabel = () => {
    const option = DeliveryOptions.find((o) => o.id === deliveryOption);
    if (!option) return deliveryOption;
    return isRTL ? option.labelAr : option.labelFr;
  };

  /* ─── Section header chip ─── */
  const SectionChip = ({ num, icon, label, color }: { num: string; icon: string; label: string; color: string }) => (
    <View style={[chipStyles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <LinearGradient colors={[color, color + "CC"]} style={chipStyles.badge}>
        <ThemedText style={chipStyles.badgeNum}>{num}</ThemedText>
      </LinearGradient>
      <View style={[chipStyles.iconWrap, { backgroundColor: color + "18" }]}>
        <Icon name={icon as any} size={16} color={color} />
      </View>
      <ThemedText style={chipStyles.label}>{label}</ThemedText>
    </View>
  );

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: insets.bottom + 100,
        },
      ]}
    >
      {/* ─── Hero banner ─── */}
      <LinearGradient
        colors={[theme.primary, theme.primaryLight || theme.primary + "BB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroIconWrap}>
          <Icon name="truck" size={30} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.heroTitle}>{t("newRequest")}</ThemedText>
          <ThemedText style={styles.heroSub}>Remplissez les informations ci-dessous</ThemedText>
        </View>
      </LinearGradient>

      {/* ─── 1. Itinéraire ─── */}
      <SectionChip num="1" icon="navigation" label="Itinéraire" color={theme.primary} />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, zIndex: 30 }]}>
        {/* Pickup */}
        <View style={styles.routeRow}>
          <View style={styles.routeTrack}>
            <View style={[styles.routeDot, { backgroundColor: theme.success }]} />
            <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
          </View>
          <View style={{ flex: 1, zIndex: 20 }}>
            <ThemedText style={[styles.routeLabel, { color: theme.textSecondary }]}>{t("pickup").toUpperCase()}</ThemedText>
            <AddressAutocomplete
              value={pickupAddress}
              onChangeText={setPickupAddress}
              onSelectAddress={(address, coords) => { setPickupAddress(address); setPickupCoords(coords); }}
              placeholder={t("enterPickup")}
              iconColor={theme.success}
              iconName="map-pin"
              onOpenMapPicker={() => setMapPickerTarget("pickup")}
            />
          </View>
        </View>

        <View style={[styles.routeDivider, { backgroundColor: theme.border }]} />

        {/* Delivery */}
        <View style={styles.routeRow}>
          <View style={styles.routeTrack}>
            <View style={[styles.routeDot, { backgroundColor: theme.error }]} />
          </View>
          <View style={{ flex: 1, zIndex: 10 }}>
            <ThemedText style={[styles.routeLabel, { color: theme.textSecondary }]}>{t("delivery").toUpperCase()}</ThemedText>
            <AddressAutocomplete
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              onSelectAddress={(address, coords) => { setDeliveryAddress(address); setDeliveryCoords(coords); }}
              placeholder={t("enterDelivery")}
              iconColor={theme.error}
              iconName="flag"
              onOpenMapPicker={() => setMapPickerTarget("delivery")}
            />
          </View>
        </View>
      </View>

      {/* ─── 2. Véhicule ─── */}
      <SectionChip num="2" icon="truck" label={t("vehicleType")} color="#7C3AED" />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <VehicleTypeSelector selected={vehicleType} onSelect={setVehicleType} />
      </View>

      {/* ─── 3. Marchandise ─── */}
      <SectionChip num="3" icon="package" label={t("goodsDescription")} color="#0EA5E9" />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, gap: Spacing.lg }]}>
        {/* Description */}
        <View>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t("describeGoods")}</ThemedText>
          <View style={[styles.textAreaBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <TextInput
              style={[styles.textArea, { color: theme.text, textAlign: isRTL ? "right" : "left" }]}
              placeholder={t("describeGoods")}
              placeholderTextColor={theme.textSecondary}
              value={goodsDescription}
              onChangeText={setGoodsDescription}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Weight stepper */}
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>{t("estimatedWeight")}</ThemedText>
            {/* kg / tn unit toggle */}
            <View style={[styles.unitToggle, { backgroundColor: theme.backgroundSecondary }]}>
              {(["kg", "tn"] as const).map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => handleSwitchUnit(unit)}
                  style={[
                    styles.unitToggleBtn,
                    weightUnit === unit && { backgroundColor: theme.primary },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.unitToggleText,
                      { color: weightUnit === unit ? "#FFFFFF" : theme.textSecondary },
                    ]}
                  >
                    {unit}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[styles.weightStepper, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Pressable
              onPress={decrementWeight}
              style={({ pressed }) => [styles.stepBtn, { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.6 : 1 }]}
            >
              <Icon name="minus" size={20} color={theme.primary} />
            </Pressable>
            <View style={[styles.weightCenter, { backgroundColor: theme.backgroundSecondary }]}>
              <TextInput
                style={[styles.weightNum, { color: theme.text }]}
                value={estimatedWeight}
                onChangeText={setEstimatedWeight}
                keyboardType="decimal-pad"
              />
              <ThemedText style={[styles.weightUnit, { color: theme.textSecondary }]}>{weightUnit}</ThemedText>
            </View>
            <Pressable
              onPress={incrementWeight}
              style={({ pressed }) => [styles.stepBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Icon name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* ─── 4. Option de livraison ─── */}
      <SectionChip num="4" icon="zap" label={t("deliveryOption")} color="#F59E0B" />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
        <DeliveryOptionSelector selected={deliveryOption} onSelect={setDeliveryOption} />
      </View>

      {/* ─── 5. Prix proposé ─── */}
      <SectionChip num="5" icon="tag" label={isRTL ? "السعر المقترح" : "Prix proposé"} color="#10B981" />
      <LinearGradient
        colors={["#064E3B", "#065F46"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.priceGradientCard}
      >
        <ThemedText style={styles.priceLabel}>
          {isRTL ? "أدخل السعر الذي تقترحه (MAD)" : "Entrez votre prix proposé (MAD)"}
        </ThemedText>
        <View style={styles.priceInputRow}>
          <TextInput
            style={[styles.priceInput, { textAlign: isRTL ? "right" : "left" }]}
            value={clientPrice}
            onChangeText={(v) => setClientPrice(v.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={6}
          />
          <ThemedText style={styles.priceCurrency}>{t("mad")}</ThemedText>
        </View>
        <View style={styles.priceInfoRow}>
          <Icon name="info" size={13} color="rgba(255,255,255,0.55)" />
          <ThemedText style={styles.priceInfoText}>
            {isRTL
              ? "يُحدَّد السعر النهائي بالاتفاق مع السائق"
              : "Le prix final sera convenu avec le chauffeur"}
          </ThemedText>
        </View>
      </LinearGradient>

      {/* ─── 6. Options ─── */}
      <SectionChip num="6" icon="settings" label="Options" color="#6366F1" />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, gap: 0 }]}>
        {/* Schedule toggle */}
        <Pressable
          onPress={() => setIsScheduled(!isScheduled)}
          style={[styles.optionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          <View style={[styles.optionIconBox, { backgroundColor: "#6366F115" }]}>
            <Icon name="calendar" size={20} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.optionTitle}>{t("scheduledDelivery")}</ThemedText>
            <ThemedText style={[styles.optionSub, { color: theme.textSecondary }]}>
              {isScheduled
                ? scheduledDate.toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", { day: "2-digit", month: "short" }) +
                  " • " +
                  scheduledDate.toLocaleTimeString(language === "ar" ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" })
                : t("immediateDelivery")}
            </ThemedText>
          </View>
          <View style={[styles.toggle, { backgroundColor: isScheduled ? "#6366F1" : theme.backgroundSecondary }]}>
            <View style={[styles.toggleThumb, { alignSelf: isScheduled ? "flex-end" : "flex-start" }]} />
          </View>
        </Pressable>

        {isScheduled ? (
          <View style={[styles.schedulerRow, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[styles.dateChip, { backgroundColor: "#6366F115", borderColor: "#6366F130" }]}
            >
              <Icon name="calendar" size={16} color="#6366F1" />
              <ThemedText style={styles.dateChipText}>{scheduledDate.toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR")}</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[styles.dateChip, { backgroundColor: "#6366F115", borderColor: "#6366F130" }]}
            >
              <Icon name="clock" size={16} color="#6366F1" />
              <ThemedText style={styles.dateChipText}>
                {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {isScheduled && showDatePicker ? (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={(_event: any, date?: Date) => {
              setShowDatePicker(Platform.OS === "ios");
              if (date) setScheduledDate(date);
            }}
          />
        ) : null}

        {isScheduled && showTimePicker ? (
          <DateTimePicker
            value={scheduledDate}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_event: any, date?: Date) => {
              setShowTimePicker(Platform.OS === "ios");
              if (date) setScheduledDate(date);
            }}
          />
        ) : null}

        {favoriteDrivers.length > 0 ? (
          <>
            <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />
            <Pressable
              onPress={() => setShowDriverPicker(true)}
              style={[styles.optionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <View style={[styles.optionIconBox, { backgroundColor: "#F59E0B15" }]}>
                <Icon name="star" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.optionTitle}>{t("preferredDriver")}</ThemedText>
                <ThemedText style={[styles.optionSub, { color: theme.textSecondary }]}>
                  {selectedDriverId
                    ? favoriteDrivers.find((f) => f.driverId === selectedDriverId)?.driver?.fullName
                    : t("noPreference")}
                </ThemedText>
              </View>
              <View style={[styles.optionChevronBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name="chevron-right" size={16} color={theme.textSecondary} />
              </View>
            </Pressable>
          </>
        ) : null}
      </View>

      {/* Driver picker modal */}
      <Modal
        visible={showDriverPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDriverPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="h3">{t("selectPreferredDriver")}</ThemedText>
              <Pressable onPress={() => setShowDriverPicker(false)} style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name="x" size={18} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.driverList}>
              <Pressable
                onPress={() => { setSelectedDriverId(undefined); setShowDriverPicker(false); }}
                style={[styles.driverItem, { backgroundColor: !selectedDriverId ? theme.primary + "15" : theme.backgroundSecondary, borderColor: !selectedDriverId ? theme.primary : "transparent" }]}
              >
                <ThemedText style={{ fontWeight: "500" }}>{t("noPreference")}</ThemedText>
              </Pressable>
              {favoriteDrivers.map((fav) => (
                <Pressable
                  key={fav.id}
                  onPress={() => { setSelectedDriverId(fav.driverId); setShowDriverPicker(false); }}
                  style={[styles.driverItem, { backgroundColor: selectedDriverId === fav.driverId ? theme.primary + "15" : theme.backgroundSecondary, borderColor: selectedDriverId === fav.driverId ? theme.primary : "transparent" }]}
                >
                  <View style={styles.driverItemContent}>
                    {fav.driver?.avatarUrl ? (
                      <Image source={{ uri: fav.driver.avatarUrl }} style={styles.driverAvatar} />
                    ) : (
                      <View style={[styles.driverAvatar, { backgroundColor: theme.primary }]}>
                        <ThemedText style={{ color: "#FFF", fontWeight: "600" }}>{fav.driver?.fullName?.charAt(0) || "?"}</ThemedText>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontWeight: "500" }}>{fav.driver?.fullName}</ThemedText>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <ThemedText style={{ color: theme.textSecondary, fontSize: 13 }}>{fav.driver?.rating?.toFixed(1) || "0.0"}</ThemedText>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── 7. Paiement ─── */}
      <SectionChip num="7" icon="credit-card" label={t("paymentMethod")} color="#10B981" />
      <View style={[styles.card, { backgroundColor: theme.backgroundDefault, gap: Spacing.md }]}>
        {/* CashPlus / WafaCash checkbox */}
        <Pressable
          onPress={() => setViaCashPlusWafaCash(!viaCashPlusWafaCash)}
          style={[styles.undertakingBox, { backgroundColor: viaCashPlusWafaCash ? "#10B98108" : theme.backgroundSecondary, borderColor: viaCashPlusWafaCash ? "#10B981" : theme.border }]}
        >
          <View style={[styles.undertakingCheck, { borderColor: viaCashPlusWafaCash ? "#10B981" : theme.border, backgroundColor: viaCashPlusWafaCash ? "#10B981" : "transparent" }]}>
            {viaCashPlusWafaCash ? <Icon name="check" size={13} color="#FFFFFF" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.undertakingText, { color: viaCashPlusWafaCash ? theme.text : theme.textSecondary }]}>
              {t("viaCashPlusWafaCash")}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
              CashPlus · WafaCash
            </ThemedText>
          </View>
        </Pressable>
      </View>

      {/* ─── CTA ─── */}
      <Pressable
        onPress={handleProceedToConfirmation}
        disabled={!canProceedToConfirmation()}
        style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
      >
        <LinearGradient
          colors={canProceedToConfirmation() ? [theme.primary, theme.primaryLight || theme.primary + "CC"] : ["#9CA3AF", "#6B7280"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaButton}
        >
          <Icon name="clipboard-check" size={22} color="#FFFFFF" />
          <ThemedText style={styles.ctaText}>{t("reviewOrder")}</ThemedText>
          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
        </LinearGradient>
      </Pressable>

      {/* ─── Confirmation modal ─── */}
      <Modal
        visible={showConfirmation}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmationModal, { backgroundColor: theme.backgroundDefault }]}>
            <LinearGradient
              colors={[theme.primary, theme.primaryLight || theme.primary + "BB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmationGradientHeader}
            >
              <Pressable onPress={() => setShowConfirmation(false)} style={styles.confirmationCloseBtn} hitSlop={12}>
                <Icon name="x" size={20} color="rgba(255,255,255,0.8)" />
              </Pressable>
              <View style={styles.confirmationGradientIcon}>
                <Icon name="clipboard" size={28} color="#FFFFFF" />
              </View>
              <ThemedText style={styles.confirmationGradientTitle}>{t("orderConfirmation")}</ThemedText>
              <ThemedText style={styles.confirmationGradientSubtitle}>{t("reviewBeforeConfirm")}</ThemedText>
              <View style={styles.priceBadgeContainer}>
                <View style={[styles.priceBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <ThemedText style={styles.priceBadgeAmount}>{clientPrice || "0"}</ThemedText>
                  <ThemedText style={styles.priceBadgeCurrency}>{t("mad")}</ThemedText>
                </View>
                <ThemedText style={styles.priceBadgeLabel}>{isRTL ? "السعر المقترح" : "Prix proposé"}</ThemedText>
              </View>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.confirmationScroll} contentContainerStyle={{ paddingBottom: Spacing.md }}>
              <View style={[styles.confirmationRouteCard, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={[styles.confirmationRouteRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={styles.confirmationRouteTrack}>
                    <View style={[styles.confirmationRouteDot, { backgroundColor: theme.success }]} />
                    <View style={[styles.confirmationRouteConnector, { backgroundColor: theme.border }]} />
                    <View style={[styles.confirmationRouteDot, { backgroundColor: theme.error }]} />
                  </View>
                  <View style={styles.confirmationRouteAddresses}>
                    <View style={styles.confirmationRouteAddr}>
                      <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("from")}</ThemedText>
                      <ThemedText style={{ fontWeight: "600", fontSize: 14, lineHeight: 20 }}>{pickupAddress}</ThemedText>
                    </View>
                    <View style={[styles.confirmationRouteAddr, { paddingTop: 6 }]}>
                      <ThemedText style={{ color: theme.textSecondary, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("to")}</ThemedText>
                      <ThemedText style={{ fontWeight: "600", fontSize: 14, lineHeight: 20 }}>{deliveryAddress}</ThemedText>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.confirmationDetailsGrid}>
                <View style={[styles.confirmationDetailCell, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={[styles.confirmationDetailCellIcon, { backgroundColor: theme.primary + "18" }]}>
                    <Icon name="truck" size={20} color={theme.primary} />
                  </View>
                  <ThemedText style={[styles.confirmationDetailCellLabel, { color: theme.textSecondary }]}>{t("vehicleType")}</ThemedText>
                  <ThemedText style={styles.confirmationDetailCellValue}>{getVehicleLabel()}</ThemedText>
                </View>

                <View style={[styles.confirmationDetailCell, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={[styles.confirmationDetailCellIcon, { backgroundColor: theme.secondary + "18" }]}>
                    <Icon name="clock" size={20} color={theme.secondary} />
                  </View>
                  <ThemedText style={[styles.confirmationDetailCellLabel, { color: theme.textSecondary }]}>{t("deliveryTime")}</ThemedText>
                  <ThemedText style={styles.confirmationDetailCellValue} numberOfLines={2}>
                    {isScheduled
                      ? scheduledDate.toLocaleDateString(language === "ar" ? "ar-MA" : "fr-FR", { day: "2-digit", month: "short" }) + " " + t("scheduledDeliveryAt") + " " + scheduledDate.toLocaleTimeString(language === "ar" ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" })
                      : t("immediateDelivery")}
                  </ThemedText>
                </View>

                <View style={[styles.confirmationDetailCell, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={[styles.confirmationDetailCellIcon, { backgroundColor: "#16A34A18" }]}>
                    <Icon name="credit-card" size={20} color="#16A34A" />
                  </View>
                  <ThemedText style={[styles.confirmationDetailCellLabel, { color: theme.textSecondary }]}>{t("paymentMethod")}</ThemedText>
                  <ThemedText style={styles.confirmationDetailCellValue}>{t("cashToDriver")}</ThemedText>
                </View>

                <View style={[styles.confirmationDetailCell, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={[styles.confirmationDetailCellIcon, { backgroundColor: theme.primary + "18" }]}>
                    <Icon name="package" size={20} color={theme.primary} />
                  </View>
                  <ThemedText style={[styles.confirmationDetailCellLabel, { color: theme.textSecondary }]}>{t("estimatedWeight")}</ThemedText>
                  <ThemedText style={styles.confirmationDetailCellValue}>{estimatedWeight} {weightUnit}</ThemedText>
                </View>
              </View>

              {goodsDescription ? (
                <View style={[styles.confirmationDescCard, { backgroundColor: theme.backgroundSecondary }]}>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm }}>
                    <Icon name="package" size={16} color={theme.textSecondary} />
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{t("goodsDescription")}</ThemedText>
                  </View>
                  <ThemedText style={{ fontSize: 14, lineHeight: 20, textAlign: isRTL ? "right" : "left" }}>{goodsDescription}</ThemedText>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.confirmationActions, { borderTopColor: theme.border }]}>
              <Button onPress={handleSubmit} disabled={isSubmitting} style={styles.confirmationSubmitBtn}>
                {isSubmitting ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                      Envoi en cours...
                    </ThemedText>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                    <Icon name="check-circle" size={20} color="#FFFFFF" />
                    <ThemedText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>{t("confirmOrder")}</ThemedText>
                  </View>
                )}
              </Button>
              <Pressable
                onPress={() => setShowConfirmation(false)}
                style={({ pressed }) => [styles.confirmationModifyBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Icon name="edit-3" size={16} color={theme.textSecondary} />
                <ThemedText style={{ color: theme.textSecondary, fontWeight: "600", fontSize: 14 }}>{t("modify")}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <MapPickerModal
        visible={mapPickerTarget !== null}
        onClose={() => setMapPickerTarget(null)}
        title={
          mapPickerTarget === "pickup"
            ? t("enterPickup")
            : t("enterDelivery")
        }
        initialCoords={
          mapPickerTarget === "pickup"
            ? pickupCoords
            : deliveryCoords
        }
        onConfirm={(address, coords) => {
          if (mapPickerTarget === "pickup") {
            setPickupAddress(address);
            setPickupCoords(coords);
          } else if (mapPickerTarget === "delivery") {
            setDeliveryAddress(address);
            setDeliveryCoords(coords);
          }
          setMapPickerTarget(null);
        }}
      />
    </KeyboardAwareScrollViewCompat>
  );
}

/* ─── Chip styles (scoped) ─── */
const chipStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: -Spacing.xs },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeNum: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 0.2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },

  /* Hero */
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },

  /* Generic card */
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Route */
  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  routeTrack: { alignItems: "center", paddingTop: 18, width: 16 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeLine: { width: 2, height: 32, marginVertical: 4 },
  routeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  routeDivider: { height: 1, marginVertical: Spacing.md, marginLeft: 28 },

  /* Cargo */
  fieldLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.sm },
  textAreaBox: { borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1 },
  textArea: { fontSize: 15, minHeight: 80, textAlignVertical: "top" },

  /* Weight stepper */
  unitToggle: { flexDirection: "row", borderRadius: 20, padding: 3, gap: 2 },
  unitToggleBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
  unitToggleText: { fontSize: 13, fontWeight: "700", textTransform: "uppercase" },
  weightStepper: { alignItems: "center", gap: Spacing.md },
  stepBtn: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  weightCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 52, borderRadius: BorderRadius.md, gap: 6 },
  weightNum: { fontSize: 26, fontWeight: "800", textAlign: "center", minWidth: 60 },
  weightUnit: { fontSize: 16, fontWeight: "600" },

  /* Price */
  priceGradientCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, gap: Spacing.md },
  priceLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600", textAlign: "center" },
  priceInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, height: 72, gap: Spacing.md },
  priceInput: { flex: 1, fontSize: 40, fontWeight: "900", color: "#FFFFFF" },
  priceCurrency: { color: "rgba(255,255,255,0.8)", fontSize: 20, fontWeight: "700" },
  priceInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  priceInfoText: { color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", flex: 1 },

  /* Options */
  optionRow: { alignItems: "center", gap: Spacing.md, paddingVertical: Spacing.sm },
  optionIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 15, fontWeight: "600", marginBottom: 1 },
  optionSub: { fontSize: 13 },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: "center" },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
  schedulerRow: { flexDirection: "row", gap: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, marginTop: Spacing.sm },
  dateChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  dateChipText: { fontSize: 13, fontWeight: "600", color: "#6366F1" },
  rowDivider: { height: 1, marginVertical: Spacing.xs },
  optionChevronBox: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  /* Payment */
  paymentPill: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2 },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  undertakingBox: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1.5 },
  undertakingCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  undertakingText: { flex: 1, fontSize: 14, lineHeight: 20 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontSize: 12 },

  /* CTA */
  ctaButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 58, borderRadius: BorderRadius.lg },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center" },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "70%", paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderBottomWidth: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  driverList: { padding: Spacing.lg },
  driverItem: { padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, borderWidth: 2 },
  driverItemContent: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },

  /* Confirmation modal */
  confirmationModal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", overflow: "hidden" },
  confirmationGradientHeader: { paddingTop: Spacing.xl, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl, alignItems: "center", gap: Spacing.xs },
  confirmationCloseBtn: { position: "absolute", top: Spacing.lg, right: Spacing.lg },
  confirmationGradientIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: Spacing.xs },
  confirmationGradientTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  confirmationGradientSubtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13, textAlign: "center" },
  priceBadgeContainer: { alignItems: "center", marginTop: Spacing.md, gap: Spacing.xs },
  priceBadge: { flexDirection: "row", alignItems: "baseline", paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, gap: 6 },
  priceBadgeAmount: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
  priceBadgeCurrency: { color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: "600" },
  priceBadgeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  confirmationScroll: { flexGrow: 1 },
  confirmationRouteCard: { margin: Spacing.lg, marginBottom: 0, padding: Spacing.lg, borderRadius: BorderRadius.lg },
  confirmationRouteRow: { alignItems: "flex-start", gap: Spacing.md },
  confirmationRouteTrack: { alignItems: "center", paddingTop: 4, width: 16 },
  confirmationRouteDot: { width: 12, height: 12, borderRadius: 6 },
  confirmationRouteConnector: { width: 2, height: 30, marginVertical: 4 },
  confirmationRouteAddresses: { flex: 1, gap: 0 },
  confirmationRouteAddr: { gap: 2, minHeight: 38, justifyContent: "center" },
  confirmationDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 0 },
  confirmationDetailCell: { width: "47.5%", borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs, alignItems: "flex-start" },
  confirmationDetailCellIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  confirmationDetailCellLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  confirmationDetailCellValue: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  confirmationDescCard: { margin: Spacing.lg, marginBottom: 0, padding: Spacing.md, borderRadius: BorderRadius.md },
  confirmationActions: { gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 32, borderTopWidth: 1 },
  confirmationSubmitBtn: { width: "100%", height: 54 },
  confirmationModifyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, paddingVertical: Spacing.sm },

  /* Legacy — keep for checkbox reuse */
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },

});
