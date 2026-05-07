import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, Image, ScrollView, Alert, Platform, ActivityIndicator, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderPadding } from "@/hooks/useHeaderPadding";
import { useNavigation } from "@react-navigation/native";
import { Icon, IconName } from "@/components/Icon";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PhoneInput } from "@/components/PhoneInput";
import { VehicleTypeSelector } from "@/components/VehicleTypeSelector";

import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth, DriverDocuments } from "@/contexts/AuthContext";
import { BorderRadius, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface FormErrors {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  password?: string;
  nationalId?: string;
  vehicleType?: string;
  cinFront?: string;
  cinBack?: string;
  drivingLicenseFront?: string;
  drivingLicenseBack?: string;
  vehicleRegistrationFront?: string;
  vehicleRegistrationBack?: string;
}

interface AiWarning {
  type: "expired" | "faceMatch" | "cinMismatch" | "info";
  messageFr: string;
  messageAr: string;
}

const formatPhoneWithPrefix = (phone: string): string => {
  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("212")) return "+" + cleaned;
  const withoutLeadingZero = cleaned.replace(/^0/, "");
  return "+212" + withoutLeadingZero;
};

const MOROCCAN_CIN_REGEX = /^[A-Za-z]{1,2}[0-9]{5,7}$/;

export default function DriverRegistrationScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderPadding();
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { t, isRTL, language } = useLanguage();
  const { signupDriver } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  const [documents, setDocuments] = useState<DriverDocuments>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const cinScanAnim = useRef(new Animated.Value(0)).current;
  const licenseFrontScanAnim = useRef(new Animated.Value(0)).current;
  const licenseBackScanAnim = useRef(new Animated.Value(0)).current;
  const carteGriseScanAnim = useRef(new Animated.Value(0)).current;

  const animateStep = (fn: () => void, direction: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction * -24, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideAnim.setValue(direction * 24);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  };
  const [isAiVerifying, setIsAiVerifying] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<AiWarning[]>([]);
  const [cinCheckStatus, setCinCheckStatus] = useState<"idle" | "checking" | "passed" | "mismatch" | "expired" | "underage" | "both_failed" | "error">("idle");
  const [licenseFrontStatus, setLicenseFrontStatus] = useState<"idle" | "checking" | "passed" | "mismatch" | "error">("idle");
  const [licenseBackStatus, setLicenseBackStatus] = useState<"idle" | "checking" | "passed" | "expired" | "error">("idle");
  const [carteGriseStatus, setCarteGriseStatus] = useState<"idle" | "checking" | "passed" | "expired" | "error">("idle");

  const makeScanLoop = (anim: Animated.Value, active: boolean) => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
      anim.setValue(0);
    }
  };

  useEffect(() => { makeScanLoop(cinScanAnim, cinCheckStatus === "checking"); }, [cinCheckStatus]);
  useEffect(() => { makeScanLoop(licenseFrontScanAnim, licenseFrontStatus === "checking"); }, [licenseFrontStatus]);
  useEffect(() => { makeScanLoop(licenseBackScanAnim, licenseBackStatus === "checking"); }, [licenseBackStatus]);
  useEffect(() => { makeScanLoop(carteGriseScanAnim, carteGriseStatus === "checking"); }, [carteGriseStatus]);
  const [cinCheckDetail, setCinCheckDetail] = useState<{ fr: string; ar: string } | null>(null);
  const [cinExtracted, setCinExtracted] = useState<{ number: string | null; expiryDate: string | null; dateOfBirth: string | null } | null>(null);

  const [licenseFrontDetail, setLicenseFrontDetail] = useState<{ fr: string; ar: string } | null>(null);
  const [licenseFrontExtracted, setLicenseFrontExtracted] = useState<{ number: string | null } | null>(null);

  const [licenseBackDetail, setLicenseBackDetail] = useState<{ fr: string; ar: string } | null>(null);
  const [licenseBackExtracted, setLicenseBackExtracted] = useState<{ expiryDate: string | null } | null>(null);

  const [carteGriseDetail, setCarteGriseDetail] = useState<{ fr: string; ar: string } | null>(null);
  const [carteGriseExtracted, setCarteGriseExtracted] = useState<{ expiryDate: string | null } | null>(null);

  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    if (cleaned.length >= 9 && cleaned.length <= 13) {
      const digitsOnly = cleaned.replace(/\D/g, "");
      if (digitsOnly.length === 9 && /^[5-7][0-9]{8}$/.test(digitsOnly)) return true;
      if (digitsOnly.length === 10 && /^0[5-7][0-9]{8}$/.test(digitsOnly)) return true;
      if (digitsOnly.length === 12 && /^212[5-7][0-9]{8}$/.test(digitsOnly)) return true;
    }
    return false;
  };

  const handleDateOfBirthChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    setDateOfBirth(formatted);
  };

  const getAgeFromDOB = (dob: string): number | null => {
    const parts = dob.split("/");
    if (parts.length !== 3) return null;
    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year || year < 1900 || year > new Date().getFullYear()) return null;
    const birthDate = new Date(year, month - 1, day);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) newErrors.fullName = t("requiredField");

    if (!phone.trim()) {
      newErrors.phone = t("requiredField");
    } else if (!validatePhone(phone)) {
      newErrors.phone = t("invalidPhone");
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = language === "ar" ? "تاريخ الميلاد مطلوب" : "Date de naissance requise";
    } else if (dateOfBirth.length < 10) {
      newErrors.dateOfBirth = language === "ar" ? "صيغة غير صحيحة (مثال: 01/01/1990)" : "Format invalide (ex: 01/01/1990)";
    } else {
      const age = getAgeFromDOB(dateOfBirth);
      if (age === null) {
        newErrors.dateOfBirth = language === "ar" ? "تاريخ الميلاد غير صحيح" : "Date de naissance invalide";
      } else if (age < 18) {
        newErrors.dateOfBirth = language === "ar"
          ? "يجب أن يكون عمرك 18 سنة على الأقل"
          : "Vous devez avoir au moins 18 ans pour vous inscrire";
      }
    }

    if (!password.trim()) {
      newErrors.password = t("requiredField");
    } else if (password.length < 6) {
      newErrors.password = t("passwordMinLength");
    }

    if (!nationalId.trim()) {
      newErrors.nationalId = t("requiredField");
    } else if (!MOROCCAN_CIN_REGEX.test(nationalId.trim())) {
      newErrors.nationalId = language === "ar"
        ? "رقم بطاقة الهوية غير صحيح (مثال: AB123456)"
        : "Numéro CIN invalide (ex: AB123456)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!documents.cinFront) newErrors.cinFront = t("requiredField");
    if (!documents.cinBack) newErrors.cinBack = t("requiredField");
    if (!documents.drivingLicenseFront) newErrors.drivingLicenseFront = t("requiredField");
    if (!documents.drivingLicenseBack) newErrors.drivingLicenseBack = t("requiredField");
    if (!documents.vehicleRegistrationFront) newErrors.vehicleRegistrationFront = t("requiredField");
    if (!documents.vehicleRegistrationBack) newErrors.vehicleRegistrationBack = t("requiredField");

    if (documents.cinFront && cinCheckStatus === "checking") {
      newErrors.cinFront = language === "ar" ? "جارٍ التحقق من البطاقة..." : "Vérification de la CIN en cours...";
    } else if (cinCheckStatus === "mismatch" || cinCheckStatus === "expired" || cinCheckStatus === "underage" || cinCheckStatus === "both_failed") {
      newErrors.cinFront = language === "ar" ? "يجب رفع بطاقة CIN صحيحة وسارية" : "Importez une CIN valide et correspondante";
    }

    if (documents.drivingLicenseFront && licenseFrontStatus === "checking") {
      newErrors.drivingLicenseFront = language === "ar" ? "جارٍ التحقق من الرخصة..." : "Vérification du permis en cours...";
    } else if (licenseFrontStatus === "mismatch") {
      newErrors.drivingLicenseFront = language === "ar" ? "رقم البطاقة في الرخصة غير متطابق" : "Le numéro CIN du permis ne correspond pas";
    }

    if (documents.drivingLicenseBack && licenseBackStatus === "checking") {
      newErrors.drivingLicenseBack = language === "ar" ? "جارٍ التحقق من صلاحية الرخصة..." : "Vérification de la validité en cours...";
    }

    if (documents.vehicleRegistrationFront && carteGriseStatus === "checking") {
      newErrors.vehicleRegistrationFront = language === "ar" ? "جارٍ التحقق من الوثيقة..." : "Vérification de la carte grise en cours...";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const newErrors: FormErrors = {};
    if (!vehicleType) newErrors.vehicleType = t("selectVehicleType");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const imageUriToBase64 = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      if (uri.startsWith("data:")) return uri.split(",")[1];
      const res = await fetch(uri);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    const filePath = uri.replace("file://", "");
    return await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  const checkCinDocument = async (savedUri: string) => {
    setCinCheckStatus("checking");
    setCinCheckDetail(null);
    setCinExtracted(null);
    try {
      const cinFrontBase64 = await imageUriToBase64(savedUri);
      const response = await fetch(
        new URL("/api/ai/verify-cin", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cinFrontBase64,
            enteredCinNumber: nationalId,
            mimeType: "image/jpeg",
          }),
        }
      );

      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const result = data.result;

      setCinExtracted({
        number: result.cinNumberExtracted ?? null,
        expiryDate: result.expiryDate ?? null,
        dateOfBirth: result.dateOfBirth ?? null,
      });

      const warnings: string[] = result.warnings ?? [];

      if (warnings.includes("not_a_cin_document") || warnings.includes("no_data_extracted")) {
        setCinCheckStatus("mismatch");
        setCinCheckDetail({
          fr: "❌ Cette image ne ressemble pas à une CIN marocaine valide. Veuillez importer une photo claire de votre carte d'identité nationale (recto).",
          ar: "❌ هذه الصورة لا تبدو بطاقة CIN مغربية صالحة. يرجى رفع صورة واضحة لوجه بطاقة الهوية الوطنية.",
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      const isMismatch = result.cinNumberMatch === false;
      const isExpired = result.expired === true;
      const isUnderage = result.underAge === true;

      const failuresFr: string[] = [];
      const failuresAr: string[] = [];

      if (isMismatch) {
        failuresFr.push(`Le numéro sur la carte (${result.cinNumberExtracted ?? "?"}) ne correspond pas à ce que vous avez saisi (${nationalId}).`);
        failuresAr.push(`رقم البطاقة (${result.cinNumberExtracted ?? "?"}) لا يتطابق مع الرقم المُدخَل (${nationalId}).`);
      }
      if (isExpired) {
        failuresFr.push(`CIN expirée${result.expiryDate ? ` le ${result.expiryDate}` : ""}. Renouvelez-la avant de vous inscrire.`);
        failuresAr.push(`البطاقة منتهية الصلاحية${result.expiryDate ? ` بتاريخ ${result.expiryDate}` : ""}. يجب تجديدها قبل التسجيل.`);
      }
      if (isUnderage) {
        failuresFr.push(`Vous devez avoir au moins 18 ans pour conduire${result.dateOfBirth ? ` (né(e) le ${result.dateOfBirth})` : ""}.`);
        failuresAr.push(`يجب أن يكون عمرك 18 سنة على الأقل للتسجيل كسائق${result.dateOfBirth ? ` (تاريخ الميلاد: ${result.dateOfBirth})` : ""}.`);
      }

      if (failuresFr.length > 0) {
        const status = isMismatch && !isExpired && !isUnderage ? "mismatch"
          : isExpired && !isMismatch && !isUnderage ? "expired"
          : isUnderage && !isMismatch && !isExpired ? "underage"
          : "both_failed";
        setCinCheckStatus(status);
        setCinCheckDetail({
          fr: "❌ " + failuresFr.join(" "),
          ar: "❌ " + failuresAr.join(" "),
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setCinCheckStatus("passed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("CIN check error:", err);
      setCinCheckStatus("error");
      setCinCheckDetail({
        fr: "⚠️ Impossible de vérifier la CIN automatiquement. Continuez et l'admin vérifiera manuellement.",
        ar: "⚠️ تعذّر التحقق التلقائي من البطاقة. تابع وسيقوم المسؤول بالتحقق يدوياً.",
      });
    }
  };

  const runAiVerification = async () => {};

  const checkLicenseFront = async (savedUri: string) => {
    const cinFromCard = cinExtracted?.number ?? nationalId ?? "";
    setLicenseFrontStatus("checking");
    setLicenseFrontDetail(null);
    setLicenseFrontExtracted(null);
    try {
      const imageBase64 = await imageUriToBase64(savedUri);
      const response = await fetch(
        new URL("/api/ai/verify-license-front", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, cinNumberFromCard: cinFromCard, mimeType: "image/jpeg" }),
        }
      );
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const result = data.result;
      const warnings: string[] = result.warnings ?? [];
      setLicenseFrontExtracted({ number: result.cinNumberExtracted ?? null });

      if (warnings.includes("not_a_license_document") || warnings.includes("no_data_extracted")) {
        setLicenseFrontStatus("mismatch");
        setLicenseFrontDetail({
          fr: "❌ Cette image ne ressemble pas au recto d'un permis de conduire marocain. Veuillez importer une photo claire du recto de votre permis.",
          ar: "❌ هذه الصورة لا تبدو الوجه الأمامي لرخصة قيادة مغربية. يرجى رفع صورة واضحة للوجه الأمامي لرخصتك.",
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (result.cinNumberMatch === false) {
        setLicenseFrontStatus("mismatch");
        setLicenseFrontDetail({
          fr: `❌ Le numéro CIN sur le permis (${result.cinNumberExtracted ?? "?"}) ne correspond pas à la carte CIN (${cinFromCard}).`,
          ar: `❌ رقم البطاقة في الرخصة (${result.cinNumberExtracted ?? "?"}) لا يتطابق مع بطاقة التعريف (${cinFromCard}).`,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setLicenseFrontStatus("passed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("License front check error:", err);
      setLicenseFrontStatus("error");
      setLicenseFrontDetail({
        fr: "⚠️ Impossible de vérifier le permis automatiquement.",
        ar: "⚠️ تعذّر التحقق التلقائي من الرخصة.",
      });
    }
  };

  const checkCarteGrise = async (savedUri: string) => {
    setCarteGriseStatus("checking");
    setCarteGriseDetail(null);
    setCarteGriseExtracted(null);
    try {
      const imageBase64 = await imageUriToBase64(savedUri);
      const response = await fetch(
        new URL("/api/ai/verify-carte-grise", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
        }
      );
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const result = data.result;
      const warnings: string[] = result.warnings ?? [];
      setCarteGriseExtracted({ expiryDate: result.expiryDate ?? null });

      if (warnings.includes("not_a_carte_grise_document") || warnings.includes("no_data_extracted")) {
        setCarteGriseStatus("error");
        setCarteGriseDetail({
          fr: "❌ Cette image ne ressemble pas à une carte grise marocaine. Veuillez importer une photo claire du recto de votre carte grise.",
          ar: "❌ هذه الصورة لا تبدو وثيقة سيارة مغربية. يرجى رفع صورة واضحة للوجه الأمامي لوثيقة سيارتك.",
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (result.expired === true) {
        setCarteGriseStatus("expired");
        setCarteGriseDetail({
          fr: `⚠️ Carte grise expirée${result.expiryDate ? ` le ${result.expiryDate}` : ""}. Pensez à la renouveler.`,
          ar: `⚠️ الوثيقة منتهية الصلاحية${result.expiryDate ? ` بتاريخ ${result.expiryDate}` : ""}. يُنصح بتجديدها.`,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setCarteGriseStatus("passed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("Carte grise check error:", err);
      setCarteGriseStatus("error");
      setCarteGriseDetail({
        fr: "⚠️ Impossible de vérifier la date d'expiration de la carte grise automatiquement.",
        ar: "⚠️ تعذّر التحقق التلقائي من تاريخ انتهاء الوثيقة.",
      });
    }
  };

  const checkLicenseBack = async (savedUri: string) => {
    setLicenseBackStatus("checking");
    setLicenseBackDetail(null);
    setLicenseBackExtracted(null);
    try {
      const imageBase64 = await imageUriToBase64(savedUri);
      const response = await fetch(
        new URL("/api/ai/verify-license-back", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, mimeType: "image/jpeg" }),
        }
      );
      if (!response.ok) throw new Error("Server error");
      const data = await response.json();
      const result = data.result;
      const warnings: string[] = result.warnings ?? [];
      setLicenseBackExtracted({ expiryDate: result.expiryDate ?? null });

      if (warnings.includes("not_a_license_document") || warnings.includes("no_data_extracted")) {
        setLicenseBackStatus("error");
        setLicenseBackDetail({
          fr: "❌ Cette image ne ressemble pas au verso d'un permis de conduire marocain. Veuillez importer une photo claire du verso de votre permis.",
          ar: "❌ هذه الصورة لا تبدو الوجه الخلفي لرخصة قيادة مغربية. يرجى رفع صورة واضحة للوجه الخلفي لرخصتك.",
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (result.expired === true) {
        setLicenseBackStatus("expired");
        setLicenseBackDetail({
          fr: `⚠️ Permis expiré${result.expiryDate ? ` le ${result.expiryDate}` : ""}. Pensez à le renouveler.`,
          ar: `⚠️ الرخصة منتهية الصلاحية${result.expiryDate ? ` بتاريخ ${result.expiryDate}` : ""}. يُنصح بتجديدها.`,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        setLicenseBackStatus("passed");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("License back check error:", err);
      setLicenseBackStatus("error");
      setLicenseBackDetail({
        fr: "⚠️ Impossible de vérifier la date d'expiration du permis automatiquement.",
        ar: "⚠️ تعذّر التحقق التلقائي من تاريخ انتهاء الرخصة.",
      });
    }
  };

  const pickImage = async (documentType: keyof DriverDocuments) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("requiredField"), "Permission to access gallery is required");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const savedPath = await saveDocumentLocally(uri, documentType);
        setDocuments((prev) => ({ ...prev, [documentType]: savedPath }));
        setErrors((prev) => ({ ...prev, [documentType]: undefined }));
        if (documentType === "cinFront") {
          setAiWarnings([]);
          checkCinDocument(savedPath);
        } else if (documentType === "drivingLicenseFront") {
          checkLicenseFront(savedPath);
        } else if (documentType === "drivingLicenseBack") {
          checkLicenseBack(savedPath);
        } else if (documentType === "vehicleRegistrationFront") {
          checkCarteGrise(savedPath);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const takePhoto = async (documentType: keyof DriverDocuments) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("requiredField"), "Permission to access camera is required");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const savedPath = await saveDocumentLocally(uri, documentType);
        setDocuments((prev) => ({ ...prev, [documentType]: savedPath }));
        setErrors((prev) => ({ ...prev, [documentType]: undefined }));
        if (documentType === "cinFront") {
          setAiWarnings([]);
          checkCinDocument(savedPath);
        } else if (documentType === "drivingLicenseFront") {
          checkLicenseFront(savedPath);
        } else if (documentType === "drivingLicenseBack") {
          checkLicenseBack(savedPath);
        } else if (documentType === "vehicleRegistrationFront") {
          checkCarteGrise(savedPath);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const saveDocumentLocally = async (uri: string, documentType: string): Promise<string> => {
    if (Platform.OS === "web") return uri;
    const documentsDir = `${FileSystem.documentDirectory}fayage_documents/`;
    const dirInfo = await FileSystem.getInfoAsync(documentsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
    }
    const fileName = `${documentType}_${Date.now()}.jpg`;
    const newPath = `${documentsDir}${fileName}`;
    await FileSystem.copyAsync({ from: uri, to: newPath });
    return newPath;
  };

  const showImagePickerOptions = (documentType: keyof DriverDocuments) => {
    if (Platform.OS === "web") {
      pickImage(documentType);
      return;
    }
    Alert.alert(t("uploadPhoto"), "", [
      { text: t("cancel"), style: "cancel" },
      { text: "Galerie", onPress: () => pickImage(documentType) },
      { text: "Caméra", onPress: () => takePhoto(documentType) },
    ]);
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep === 1 && validateStep1()) {
      animateStep(() => setCurrentStep(2), 1);
    } else if (currentStep === 2 && validateStep3()) {
      animateStep(() => setCurrentStep(3), 1);
    } else if (currentStep === 3 && validateStep4()) {
      handleSubmit();
    }
  };

  const handlePrevious = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 1) animateStep(() => setCurrentStep(currentStep - 1), -1);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    setIsSubmitting(true);
    try {
      const aiChecksAllPassed = cinCheckStatus === "passed" && licenseFrontStatus === "passed";
      const phoneDigits = phone.replace(/[^0-9]/g, "");
      const autoEmail = `driver${phoneDigits}@fayage.ma`;
      await signupDriver({
        fullName,
        phone: formatPhoneWithPrefix(phone),
        email: autoEmail,
        password,
        nationalId,
        vehicleType,
        documents,
        avatarUrl: undefined,
        aiChecksAllPassed,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (aiChecksAllPassed) {
        Alert.alert(
          language === "ar" ? "تم القبول! 🎉" : "Compte approuvé ! 🎉",
          language === "ar"
            ? "تم التحقق من وثائقك بنجاح. يمكنك الآن البدء في تلقي الطلبات."
            : "Vos documents ont été vérifiés avec succès. Vous pouvez maintenant recevoir des commandes."
        );
      } else {
        Alert.alert(
          t("registrationSuccess").split("!")[0] + "!",
          t("registrationSuccess").split("!")[1]?.trim() || t("accountPendingVerification")
        );
      }
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        language === "ar" ? "خطأ في التسجيل" : "Échec de l'inscription",
        err?.message || t("registrationFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const DocumentUploadCard = ({
    label,
    documentKey,
    icon,
    isScanning = false,
    scanSuccess = false,
    scanError = false,
    scanWarning = false,
    scanAnim = cinScanAnim,
  }: {
    label: string;
    documentKey: keyof DriverDocuments;
    icon: IconName;
    isScanning?: boolean;
    scanSuccess?: boolean;
    scanError?: boolean;
    scanWarning?: boolean;
    scanAnim?: Animated.Value;
  }) => {
    const hasDocument = !!documents[documentKey];
    const hasError = !!errors[documentKey];

    const badgeColor = isScanning ? theme.primary : scanWarning ? "#F59E0B" : scanSuccess ? theme.success : theme.success;
    const badgeIcon = isScanning ? "loader" : scanWarning ? "alert-triangle" : "check-circle";

    return (
      <View style={styles.documentCard}>
        <View style={[styles.documentHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.documentInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.documentIcon, { backgroundColor: theme.primary + "15" }]}>
              <Icon name={icon} size={20} color={theme.primary} />
            </View>
            <ThemedText style={styles.documentLabel}>{label}</ThemedText>
          </View>
          {hasDocument ? (
            <View style={[styles.uploadedBadge, { backgroundColor: badgeColor + "15" }]}>
              <Icon name={badgeIcon} size={14} color={badgeColor} />
              <ThemedText style={[styles.uploadedText, { color: badgeColor }]}>
                {isScanning
                  ? (language === "ar" ? "جارٍ المسح..." : "Scan...")
                  : t("photoUploaded")}
              </ThemedText>
            </View>
          ) : null}
        </View>
        {hasDocument ? (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: documents[documentKey] }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            {/* Scanning animation overlay */}
            {isScanning && (
              <View style={[StyleSheet.absoluteFill, { overflow: "hidden", borderRadius: 10 }]}>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(37,99,235,0.08)" }]} />
                {/* Scan line */}
                <Animated.View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: "#3B82F6",
                    shadowColor: "#3B82F6",
                    shadowOpacity: 1,
                    shadowRadius: 8,
                    transform: [{
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 140],
                      }),
                    }],
                  }}
                />
                {/* Corner brackets */}
                <View style={{ position: "absolute", top: 8, left: 8, width: 20, height: 20, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#3B82F6", borderRadius: 2 }} />
                <View style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#3B82F6", borderRadius: 2 }} />
                <View style={{ position: "absolute", bottom: 8, left: 8, width: 20, height: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#3B82F6", borderRadius: 2 }} />
                <View style={{ position: "absolute", bottom: 8, right: 8, width: 20, height: 20, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#3B82F6", borderRadius: 2 }} />
              </View>
            )}
            {/* Success overlay */}
            {scanSuccess && !isScanning && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(5,150,105,0.15)", borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
                <View style={{ backgroundColor: theme.success, borderRadius: 30, padding: 10 }}>
                  <Icon name="check" size={28} color="#fff" />
                </View>
              </View>
            )}
            {/* Warning overlay (expired) */}
            {scanWarning && !isScanning && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,158,11,0.15)", borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
                <View style={{ backgroundColor: "#F59E0B", borderRadius: 30, padding: 10 }}>
                  <Icon name="alert-triangle" size={28} color="#fff" />
                </View>
              </View>
            )}
            {/* Error overlay */}
            {scanError && !isScanning && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(220,38,38,0.15)", borderRadius: 10, alignItems: "center", justifyContent: "center" }]}>
                <View style={{ backgroundColor: theme.error, borderRadius: 30, padding: 10 }}>
                  <Icon name="x" size={28} color="#fff" />
                </View>
              </View>
            )}
            <Pressable
              onPress={() => showImagePickerOptions(documentKey)}
              style={[styles.changeButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Icon name="edit-2" size={16} color={theme.primary} />
              <ThemedText style={{ color: theme.primary, fontSize: 13, fontWeight: "500" }}>
                {t("changePhoto")}
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => showImagePickerOptions(documentKey)}
            style={({ pressed }) => [
              styles.uploadArea,
              {
                borderColor: hasError ? theme.error : theme.border,
                backgroundColor: hasError ? theme.error + "05" : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="upload" size={32} color={hasError ? theme.error : theme.textSecondary} />
            <ThemedText style={{ color: hasError ? theme.error : theme.textSecondary, marginTop: Spacing.sm }}>
              {t("uploadPhoto")}
            </ThemedText>
          </Pressable>
        )}
        {hasError ? (
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            {errors[documentKey]}
          </ThemedText>
        ) : null}
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={styles.stepIconLarge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Icon name="user" size={26} color="#FFFFFF" />
        </LinearGradient>
        <ThemedText type="h3" style={styles.stepTitle}>{t("personalInfo")}</ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          {language === "ar" ? "أدخل بياناتك الشخصية" : "Renseignez vos informations personnelles"}
        </ThemedText>
      </View>

      <View style={styles.formFields}>
        <Input
          label={t("fullName")}
          icon="user"
          placeholder={t("fullName")}
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
        />
        <PhoneInput
          label={t("phone")}
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
        />
        <Input
          label={language === "ar" ? "تاريخ الميلاد" : "Date de naissance"}
          icon="calendar"
          placeholder="JJ/MM/AAAA"
          value={dateOfBirth}
          onChangeText={handleDateOfBirthChange}
          keyboardType="number-pad"
          maxLength={10}
          error={errors.dateOfBirth}
        />
        <Input
          label={t("password")}
          icon="lock"
          placeholder="********"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
        />
        <Input
          label={t("nationalIdNumber")}
          icon="credit-card"
          placeholder="AB123456"
          value={nationalId}
          onChangeText={(v) => setNationalId(v.toUpperCase())}
          autoCapitalize="characters"
          error={errors.nationalId}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#5B21B6", "#7C3AED"]} style={styles.stepIconLarge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Icon name="file-text" size={26} color="#FFFFFF" />
        </LinearGradient>
        <ThemedText type="h3" style={styles.stepTitle}>{t("documents")}</ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          {t("pleaseUploadAllDocuments")}
        </ThemedText>
      </View>


      <ScrollView
        style={styles.documentsScroll}
        contentContainerStyle={styles.documentsContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="label" style={[styles.documentSectionTitle, { color: theme.textSecondary }]}>
          {t("cinSection")}
        </ThemedText>
        <DocumentUploadCard
          label={t("cinFront")}
          documentKey="cinFront"
          icon="credit-card"
          isScanning={cinCheckStatus === "checking"}
          scanSuccess={cinCheckStatus === "passed"}
          scanError={cinCheckStatus === "mismatch" || cinCheckStatus === "expired" || cinCheckStatus === "underage" || cinCheckStatus === "both_failed"}
        />

        {cinCheckStatus === "checking" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "60" }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText style={[styles.cinStatusText, { color: theme.primary }]}>
              {language === "ar" ? "جارٍ قراءة بيانات البطاقة..." : "Lecture de la carte en cours..."}
            </ThemedText>
          </View>
        )}

        {cinCheckStatus === "passed" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.success + "18", borderColor: theme.success + "60" }]}>
            <Icon name="check-circle" size={16} color={theme.success} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.success }]}>
                {language === "ar" ? "✅ بطاقة CIN مطابقة وسارية" : "✅ CIN valide et correspondante"}
              </ThemedText>
              {cinExtracted?.number ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `رقم البطاقة: ${cinExtracted.number}` : `Numéro : ${cinExtracted.number}`}
                </ThemedText>
              ) : null}
              {cinExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `تاريخ الانتهاء: ${cinExtracted.expiryDate}` : `Valable jusqu'au : ${cinExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
              {cinExtracted?.dateOfBirth ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `تاريخ الميلاد: ${cinExtracted.dateOfBirth}` : `Date de naissance : ${cinExtracted.dateOfBirth}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}

        {(cinCheckStatus === "mismatch" || cinCheckStatus === "expired" || cinCheckStatus === "underage" || cinCheckStatus === "both_failed") && cinCheckDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.error + "18", borderColor: theme.error + "60" }]}>
            <Icon name="x-circle" size={16} color={theme.error} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.error, textAlign: isRTL ? "right" : "left" }]}>
                {language === "ar" ? cinCheckDetail.ar : cinCheckDetail.fr}
              </ThemedText>
              {cinExtracted?.number ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.error }]}>
                  {language === "ar" ? `رقم مقروء على البطاقة: ${cinExtracted.number}` : `Numéro lu sur la carte : ${cinExtracted.number}`}
                </ThemedText>
              ) : null}
              {cinExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.error }]}>
                  {language === "ar" ? `تاريخ الانتهاء: ${cinExtracted.expiryDate}` : `Date d'expiration : ${cinExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
              {cinExtracted?.dateOfBirth ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.error }]}>
                  {language === "ar" ? `تاريخ الميلاد: ${cinExtracted.dateOfBirth}` : `Date de naissance : ${cinExtracted.dateOfBirth}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}

        {cinCheckStatus === "error" && cinCheckDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
              {language === "ar" ? cinCheckDetail.ar : cinCheckDetail.fr}
            </ThemedText>
          </View>
        )}

        <DocumentUploadCard
          label={t("cinBack")}
          documentKey="cinBack"
          icon="credit-card"
          isScanning={cinCheckStatus === "checking"}
          scanSuccess={cinCheckStatus === "passed"}
          scanError={cinCheckStatus === "mismatch" || cinCheckStatus === "expired" || cinCheckStatus === "underage" || cinCheckStatus === "both_failed"}
        />

        <ThemedText type="label" style={[styles.documentSectionTitle, { color: theme.textSecondary, marginTop: Spacing.lg }]}>
          {t("drivingLicenseSection")}
        </ThemedText>
        <DocumentUploadCard
          label={t("drivingLicenseFront")}
          documentKey="drivingLicenseFront"
          icon="award"
          isScanning={licenseFrontStatus === "checking"}
          scanSuccess={licenseFrontStatus === "passed"}
          scanError={licenseFrontStatus === "mismatch" || licenseFrontStatus === "error"}
          scanAnim={licenseFrontScanAnim}
        />
        {licenseFrontStatus === "checking" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "60" }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText style={[styles.cinStatusText, { color: theme.primary }]}>
              {language === "ar" ? "جارٍ التحقق من رقم CIN في الرخصة..." : "Vérification du numéro CIN sur le permis..."}
            </ThemedText>
          </View>
        )}
        {licenseFrontStatus === "passed" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.success + "18", borderColor: theme.success + "60" }]}>
            <Icon name="check-circle" size={16} color={theme.success} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.success }]}>
                {language === "ar" ? "✅ رقم CIN في الرخصة متطابق" : "✅ Numéro CIN du permis correspondant"}
              </ThemedText>
              {licenseFrontExtracted?.number ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `رقم على الرخصة: ${licenseFrontExtracted.number}` : `Numéro sur le permis : ${licenseFrontExtracted.number}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {licenseFrontStatus === "mismatch" && licenseFrontDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.error + "18", borderColor: theme.error + "60" }]}>
            <Icon name="x-circle" size={16} color={theme.error} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.error, textAlign: isRTL ? "right" : "left" }]}>
                {language === "ar" ? licenseFrontDetail.ar : licenseFrontDetail.fr}
              </ThemedText>
              {licenseFrontExtracted?.number ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.error }]}>
                  {language === "ar" ? `رقم مقروء على الرخصة: ${licenseFrontExtracted.number}` : `Numéro lu sur le permis : ${licenseFrontExtracted.number}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {licenseFrontStatus === "error" && licenseFrontDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
              {language === "ar" ? licenseFrontDetail.ar : licenseFrontDetail.fr}
            </ThemedText>
          </View>
        )}

        <DocumentUploadCard
          label={t("drivingLicenseBack")}
          documentKey="drivingLicenseBack"
          icon="award"
          isScanning={licenseBackStatus === "checking"}
          scanSuccess={licenseBackStatus === "passed"}
          scanWarning={licenseBackStatus === "expired"}
          scanError={licenseBackStatus === "error"}
          scanAnim={licenseBackScanAnim}
        />
        {licenseBackStatus === "checking" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "60" }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText style={[styles.cinStatusText, { color: theme.primary }]}>
              {language === "ar" ? "جارٍ التحقق من تاريخ انتهاء الرخصة..." : "Vérification de la date d'expiration du permis..."}
            </ThemedText>
          </View>
        )}
        {licenseBackStatus === "passed" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.success + "18", borderColor: theme.success + "60" }]}>
            <Icon name="check-circle" size={16} color={theme.success} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.success }]}>
                {language === "ar" ? "✅ الرخصة سارية المفعول" : "✅ Permis valide"}
              </ThemedText>
              {licenseBackExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `صالح حتى: ${licenseBackExtracted.expiryDate}` : `Valable jusqu'au : ${licenseBackExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {licenseBackStatus === "expired" && licenseBackDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
                {language === "ar" ? licenseBackDetail.ar : licenseBackDetail.fr}
              </ThemedText>
              {licenseBackExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.warning }]}>
                  {language === "ar" ? `تاريخ الانتهاء: ${licenseBackExtracted.expiryDate}` : `Date d'expiration : ${licenseBackExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {licenseBackStatus === "error" && licenseBackDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
              {language === "ar" ? licenseBackDetail.ar : licenseBackDetail.fr}
            </ThemedText>
          </View>
        )}

        <ThemedText type="label" style={[styles.documentSectionTitle, { color: theme.textSecondary, marginTop: Spacing.lg }]}>
          {t("vehicleRegistrationSection")}
        </ThemedText>
        <DocumentUploadCard
          label={t("vehicleRegistrationFront")}
          documentKey="vehicleRegistrationFront"
          icon="truck"
          isScanning={carteGriseStatus === "checking"}
          scanSuccess={carteGriseStatus === "passed"}
          scanWarning={carteGriseStatus === "expired"}
          scanError={carteGriseStatus === "error"}
          scanAnim={carteGriseScanAnim}
        />
        {carteGriseStatus === "checking" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.primary + "18", borderColor: theme.primary + "60" }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText style={[styles.cinStatusText, { color: theme.primary }]}>
              {language === "ar" ? "جارٍ التحقق من تاريخ انتهاء الوثيقة..." : "Vérification de la date d'expiration de la carte grise..."}
            </ThemedText>
          </View>
        )}
        {carteGriseStatus === "passed" && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.success + "18", borderColor: theme.success + "60" }]}>
            <Icon name="check-circle" size={16} color={theme.success} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.success }]}>
                {language === "ar" ? "✅ الوثيقة سارية المفعول" : "✅ Carte grise valide"}
              </ThemedText>
              {carteGriseExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.success }]}>
                  {language === "ar" ? `صالحة حتى: ${carteGriseExtracted.expiryDate}` : `Valable jusqu'au : ${carteGriseExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {carteGriseStatus === "expired" && carteGriseDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
                {language === "ar" ? carteGriseDetail.ar : carteGriseDetail.fr}
              </ThemedText>
              {carteGriseExtracted?.expiryDate ? (
                <ThemedText style={[styles.cinExtractedRow, { color: theme.warning }]}>
                  {language === "ar" ? `تاريخ الانتهاء: ${carteGriseExtracted.expiryDate}` : `Date d'expiration : ${carteGriseExtracted.expiryDate}`}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}
        {carteGriseStatus === "error" && carteGriseDetail && (
          <View style={[styles.cinStatusBanner, { backgroundColor: theme.warning + "18", borderColor: theme.warning + "60" }]}>
            <Icon name="alert-triangle" size={16} color={theme.warning} />
            <ThemedText style={[styles.cinStatusText, { color: theme.warning, textAlign: isRTL ? "right" : "left" }]}>
              {language === "ar" ? carteGriseDetail.ar : carteGriseDetail.fr}
            </ThemedText>
          </View>
        )}
        <DocumentUploadCard
          label={t("vehicleRegistrationBack")}
          documentKey="vehicleRegistrationBack"
          icon="truck"
        />
      </ScrollView>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <LinearGradient colors={["#065F46", "#059669"]} style={styles.stepIconLarge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Icon name="truck" size={26} color="#FFFFFF" />
        </LinearGradient>
        <ThemedText type="h3" style={styles.stepTitle}>{t("vehicleInfo")}</ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
          {language === "ar" ? "اختر نوع مركبتك" : "Sélectionnez votre type de véhicule"}
        </ThemedText>
      </View>
      <VehicleTypeSelector selected={vehicleType} onSelect={setVehicleType} />
      {errors.vehicleType ? (
        <ThemedText style={[styles.errorText, { color: theme.error, marginTop: Spacing.sm }]}>
          {errors.vehicleType}
        </ThemedText>
      ) : null}
    </View>
  );

  const STEP_LABELS = [t("personalInfo"), t("documents"), t("vehicleInfo")];
  const STEP_ICONS: IconName[] = ["user", "file-text", "truck"];
  const STEP_COLORS = ["#2563EB", "#7C3AED", "#059669"];

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>

      {/* ── Modern Step Indicator ── */}
      <View style={[styles.progressSection, { backgroundColor: isDark ? "#111827" : "#F8FAFC", borderBottomColor: isDark ? "#1F2937" : "#E8EEF4", borderBottomWidth: 1 }]}>
        <View style={[styles.stepIndicator, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            const color = STEP_COLORS[index];
            return (
              <React.Fragment key={stepNum}>
                {index > 0 && (
                  <View style={[styles.stepConnector, {
                    backgroundColor: stepNum <= currentStep ? STEP_COLORS[index - 1] : (isDark ? "#374151" : "#E2E8F0"),
                  }]} />
                )}
                <View style={styles.stepDotCol}>
                  <View style={[styles.stepCircle, {
                    backgroundColor: isActive ? color : isCompleted ? color : (isDark ? "#1F2937" : "#F1F5F9"),
                    borderColor: isActive || isCompleted ? color : (isDark ? "#374151" : "#CBD5E1"),
                    shadowColor: isActive ? color : "transparent",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: isActive ? 6 : 0,
                  }]}>
                    {isCompleted
                      ? <Icon name="check" size={13} color="#fff" />
                      : <Icon name={STEP_ICONS[index]} size={13} color={isActive ? "#fff" : (isDark ? "#4B5563" : "#94A3B8")} />
                    }
                  </View>
                  <ThemedText style={[styles.stepLabel, {
                    color: isActive ? color : isCompleted ? (isDark ? "#9CA3AF" : "#64748B") : (isDark ? "#4B5563" : "#94A3B8"),
                    fontWeight: isActive ? "700" : "500",
                  }]} numberOfLines={2}>
                    {label}
                  </ThemedText>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAwareScrollViewCompat
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep3()}
          {currentStep === 3 && renderStep4()}
        </KeyboardAwareScrollViewCompat>
      </Animated.View>

      {/* ── Bottom Navigation ── */}
      <View
        style={[
          styles.navigationButtons,
          {
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
            borderTopColor: isDark ? "#1F2937" : "#E8EEF4",
            paddingBottom: insets.bottom + Spacing.sm,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        {currentStep > 1 ? (
          <Pressable
            onPress={handlePrevious}
            style={({ pressed }) => [
              styles.prevButton,
              {
                borderColor: isDark ? "#374151" : "#E2E8F0",
                backgroundColor: isDark ? "#1F2937" : "#F8FAFC",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name={isRTL ? "chevron-right" : "chevron-left"} size={18} color={isDark ? "#9CA3AF" : "#64748B"} />
            <ThemedText style={{ fontWeight: "600", fontSize: 14, color: isDark ? "#9CA3AF" : "#64748B" }}>{t("previous")}</ThemedText>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleNext}
          disabled={isSubmitting || isAiVerifying}
          style={({ pressed }) => [styles.nextButton, { opacity: pressed || isSubmitting || isAiVerifying ? 0.8 : 1 }]}
        >
          <LinearGradient
            colors={currentStep === totalSteps ? ["#059669", "#10B981"] : ["#1E3A8A", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButtonGradient}
          >
            {isSubmitting || isAiVerifying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <ThemedText style={styles.nextButtonText}>
                  {isAiVerifying
                    ? (language === "ar" ? "جارٍ التحقق..." : "Vérification IA...")
                    : currentStep === totalSteps
                    ? t("submit")
                    : t("next")}
                </ThemedText>
                <Icon name={isRTL ? "chevron-left" : "chevron-right"} size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  stepIndicator: {
    alignItems: "flex-start",
    justifyContent: "center",
  },
  stepDotCol: {
    alignItems: "center",
    gap: 6,
    minWidth: 64,
  },
  stepCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
    maxWidth: 64,
    lineHeight: 13,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginTop: 19,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  stepContent: { flex: 1 },
  stepHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  stepIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    textAlign: "center",
  },
  stepSubtitle: {
    textAlign: "center",
    fontSize: 14,
  },
  formFields: { gap: Spacing.md },
  documentsScroll: { maxHeight: 480 },
  documentsContainer: { gap: Spacing.md, paddingBottom: Spacing.lg },
  documentSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -Spacing.xs,
  },
  documentCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    gap: Spacing.sm,
  },
  documentHeader: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  documentInfo: {
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  documentLabel: { fontSize: 14, fontWeight: "500", flex: 1 },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  uploadedText: { fontSize: 11, fontWeight: "500" },
  previewContainer: { gap: Spacing.sm },
  previewImage: { width: "100%", height: 140, borderRadius: BorderRadius.sm },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  errorText: { fontSize: 12, marginTop: 4 },
  resendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  warningsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  cinStatusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cinStatusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  cinExtractedRow: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
    opacity: 0.85,
  },
  navigationButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  prevButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minWidth: 110,
  },
  nextButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: Spacing.xl,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
  },
});
