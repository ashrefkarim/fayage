import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  useWindowDimensions,
  Pressable,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useLanguage } from "@/contexts/LanguageContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export const ONBOARDING_SEEN_KEY = "@fayage/onboarding_seen";
// Keep static dimensions only for StyleSheet blob positioning (decorative, non-critical)
const { height: staticHeight } = Dimensions.get("window");

interface Slide {
  key: string;
  emoji: string;
  titleKey: string;
  subtitleKey: string;
  bg: string;
  accent: string;
  ringColor: string;
}

const SLIDES: Slide[] = [
  {
    key: "1",
    emoji: "🚚",
    titleKey: "onboarding1Title",
    subtitleKey: "onboarding1Subtitle",
    bg: "#0A1628",
    accent: "#1E88E5",
    ringColor: "#1565C0",
  },
  {
    key: "2",
    emoji: "📦",
    titleKey: "onboarding2Title",
    subtitleKey: "onboarding2Subtitle",
    bg: "#0D1B2A",
    accent: "#0288D1",
    ringColor: "#01579B",
  },
  {
    key: "3",
    emoji: "📍",
    titleKey: "onboarding3Title",
    subtitleKey: "onboarding3Subtitle",
    bg: "#0F0A1E",
    accent: "#5C6BC0",
    ringColor: "#283593",
  },
];

export default function OnboardingScreen() {
  const { height } = useWindowDimensions();
  const CARD_HEIGHT = height * 0.46;
  const VISUAL_HEIGHT = height - CARD_HEIGHT;
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animations
  const bgAnim = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslate = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  // Pulsing ring animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    const ripple1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const ripple2 = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(ring2, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();
    ripple1.start();
    ripple2.start();
    return () => { pulse.stop(); ripple1.stop(); ripple2.stop(); };
  }, []);

  const transitionTo = useCallback(
    (nextIndex: number) => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardTranslate, {
          toValue: isRTL ? 40 : -40,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(emojiScale, { toValue: 0.6, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex(nextIndex);
        cardTranslate.setValue(isRTL ? -40 : 40);
        Animated.parallel([
          Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(cardTranslate, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.spring(emojiScale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [isRTL, cardOpacity, cardTranslate, emojiScale]
  );

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "true");
    navigation.replace("Auth");
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      transitionTo(currentIndex + 1);
    } else {
      finish();
    }
  }, [currentIndex, transitionTo, finish]);

  const isLast = currentIndex === SLIDES.length - 1;
  const slide = SLIDES[currentIndex];

  const ring1Opacity = ring1.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.3, 0] });
  const ring1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ring2Opacity = ring2.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 0.2, 0] });
  const ring2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Background ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: slide.bg }]} />

      {/* ── Decorative blobs ── */}
      <View style={[styles.blob, styles.blobTL, { backgroundColor: slide.accent, opacity: 0.18 }]} />
      <View style={[styles.blob, styles.blobBR, { backgroundColor: slide.ringColor, opacity: 0.14 }]} />

      {/* ── Visual zone ── */}
      <View style={[styles.visualZone, { flex: 1, minHeight: VISUAL_HEIGHT * 0.8, paddingTop: insets.top + 12 }]}>
        {/* Skip */}
        {!isLast && (
          <Pressable
            onPress={finish}
            hitSlop={16}
            style={[styles.skipBtn, isRTL ? { left: 28 } : { right: 28 }]}
          >
            <ThemedText style={styles.skipText}>{t("skip")}</ThemedText>
          </Pressable>
        )}

        {/* Step counter */}
        <View style={styles.stepCounter}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    i === currentIndex
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.25)",
                  width: i === currentIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Emoji + ripple rings */}
        <View style={styles.emojiContainer}>
          {/* Ripple ring 1 */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                borderColor: slide.accent,
                opacity: ring1Opacity,
                transform: [{ scale: ring1Scale }],
              },
            ]}
          />
          {/* Ripple ring 2 */}
          <Animated.View
            style={[
              styles.rippleRing,
              {
                borderColor: slide.accent,
                opacity: ring2Opacity,
                transform: [{ scale: ring2Scale }],
              },
            ]}
          />
          {/* Static outer ring */}
          <View style={[styles.outerRing, { borderColor: `${slide.accent}40` }]} />
          {/* Static mid ring */}
          <View style={[styles.midRing, { borderColor: `${slide.accent}70` }]} />
          {/* Pulsing emoji disc */}
          <Animated.View
            style={[
              styles.emojiDisc,
              { backgroundColor: slide.accent, transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Animated.Text
              style={[styles.emoji, { transform: [{ scale: emojiScale }] }]}
            >
              {slide.emoji}
            </Animated.Text>
          </Animated.View>
        </View>
      </View>

      {/* ── Bottom card ── */}
      <View style={[styles.card, { height: CARD_HEIGHT, paddingBottom: Math.max(insets.bottom + 24, 32) }]}>
        {/* Card top notch */}
        <View style={[styles.cardNotch, { backgroundColor: slide.accent }]} />

        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ translateX: cardTranslate }],
            flex: 1,
          }}
        >
          <View style={styles.cardContent}>
            <ThemedText
              style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={2}
            >
              {t(slide.titleKey)}
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={4}
            >
              {t(slide.subtitleKey)}
            </ThemedText>
          </View>
        </Animated.View>

        {/* CTA */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.ctaWrapper, { opacity: pressed ? 0.88 : 1 }]}
        >
          <LinearGradient
            colors={[slide.accent, slide.ringColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cta}
          >
            <ThemedText style={styles.ctaText}>
              {isLast ? t("getStarted") : t("next")}
            </ThemedText>
            <ThemedText style={styles.ctaArrow}>
              {isRTL ? "←" : "→"}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const DISC = 128;
const RING_SIZE = DISC + 36;
const OUTER_RING_SIZE = DISC + 80;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1628" },

  // Blobs
  blob: {
    position: "absolute",
    borderRadius: 999,
  },
  blobTL: {
    width: 280,
    height: 280,
    top: -80,
    left: -80,
  },
  blobBR: {
    width: 220,
    height: 220,
    bottom: staticHeight * 0.44,
    right: -60,
  },

  // Visual zone
  visualZone: {
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 28,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  stepCounter: {
    position: "absolute",
    bottom: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  emojiContainer: {
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  rippleRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
  },
  outerRing: {
    position: "absolute",
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderRadius: OUTER_RING_SIZE / 2,
    borderWidth: 1,
  },
  midRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1,
  },
  emojiDisc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  emoji: {
    fontSize: 58,
    lineHeight: 70,
  },

  // Card — height is passed as inline style (computed from useWindowDimensions)
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 32,
    paddingTop: 28,
    gap: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  cardNotch: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    opacity: 0.25,
  },
  cardContent: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0D1117",
    letterSpacing: -0.5,
    lineHeight: 33,
    fontFamily: "Poppins_600SemiBold",
  },
  subtitle: {
    fontSize: 15,
    color: "#5C6B7A",
    lineHeight: 24,
  },
  ctaWrapper: {
    borderRadius: 100,
    overflow: "hidden",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 100,
    gap: 10,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: "Poppins_600SemiBold",
  },
  ctaArrow: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 18,
    fontWeight: "600",
  },
});
