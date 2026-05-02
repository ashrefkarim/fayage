import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Rect, Circle, Path, G } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");

const LETTERS = ["F", "A", "Y", "A", "G", "E"];

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  // Each letter has its own animated values
  const letterAnims = useRef(
    LETTERS.map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0.6),
    }))
  ).current;

  // Truck
  const truckX = useRef(new Animated.Value(-140)).current;
  const truckBounce = useRef(new Animated.Value(0)).current;
  const truckHonk = useRef(new Animated.Value(1)).current;
  const exhaustOpacity = useRef(new Animated.Value(0)).current;
  const exhaustScale = useRef(new Animated.Value(0.5)).current;

  // Road
  const roadWidth = useRef(new Animated.Value(0)).current;
  const roadLineX = useRef(new Animated.Value(-W)).current;

  // Tagline
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(20)).current;

  // Underline
  const underlineWidth = useRef(new Animated.Value(0)).current;

  // Dots
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Exit
  const exitOpacity = useRef(new Animated.Value(1)).current;

  // Background particles
  const particle1Y = useRef(new Animated.Value(0)).current;
  const particle2Y = useRef(new Animated.Value(0)).current;
  const particle3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Set initial letter positions: odd idx come from left, even from right
    LETTERS.forEach((_, i) => {
      const dir = i % 2 === 0 ? -60 : 60;
      letterAnims[i].translateX.setValue(dir);
    });

    // Floating background particles
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle1Y, { toValue: -12, duration: 2200, useNativeDriver: false }),
          Animated.timing(particle1Y, { toValue: 0, duration: 2200, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(particle2Y, { toValue: -8, duration: 1800, useNativeDriver: false }),
          Animated.timing(particle2Y, { toValue: 0, duration: 1800, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(particle3Y, { toValue: -15, duration: 2600, useNativeDriver: false }),
          Animated.timing(particle3Y, { toValue: 0, duration: 2600, useNativeDriver: false }),
        ]),
      ])
    ).start();

    Animated.sequence([
      // Phase 1: Road appears
      Animated.delay(200),
      Animated.timing(roadWidth, { toValue: W, duration: 400, useNativeDriver: false }),

      // Phase 2: Truck drives in from left while bouncing
      Animated.parallel([
        Animated.timing(truckX, {
          toValue: W * 0.15,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(truckBounce, { toValue: -3, duration: 120, useNativeDriver: false }),
            Animated.timing(truckBounce, { toValue: 0, duration: 120, useNativeDriver: false }),
          ]),
          { iterations: 4 }
        ),
        // Exhaust puffs
        Animated.sequence([
          Animated.delay(100),
          Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(exhaustOpacity, { toValue: 0.7, duration: 200, useNativeDriver: false }),
                Animated.timing(exhaustScale, { toValue: 1, duration: 200, useNativeDriver: false }),
              ]),
              Animated.parallel([
                Animated.timing(exhaustOpacity, { toValue: 0, duration: 250, useNativeDriver: false }),
                Animated.timing(exhaustScale, { toValue: 1.6, duration: 250, useNativeDriver: false }),
              ]),
            ]),
            { iterations: 4 }
          ),
        ]),
      ]),

      // Phase 3: Truck honk (scale pulse)
      Animated.spring(truckHonk, {
        toValue: 1.18,
        useNativeDriver: false,
        tension: 300,
        friction: 4,
      }),
      Animated.spring(truckHonk, {
        toValue: 1,
        useNativeDriver: false,
        tension: 200,
        friction: 8,
      }),

      // Phase 4: Road dash line slides in
      Animated.timing(roadLineX, { toValue: 0, duration: 300, useNativeDriver: false }),

      // Phase 5: Letters animate in with stagger
      Animated.stagger(
        90,
        LETTERS.map((_, i) =>
          Animated.parallel([
            Animated.spring(letterAnims[i].translateX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 100,
              friction: 9,
            }),
            Animated.timing(letterAnims[i].opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.spring(letterAnims[i].scale, {
              toValue: 1,
              useNativeDriver: false,
              tension: 90,
              friction: 8,
            }),
          ])
        )
      ),

      // Phase 6: Underline sweeps in
      Animated.timing(underlineWidth, { toValue: 1, duration: 400, useNativeDriver: false }),

      // Phase 7: Tagline + dots
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.spring(tagY, { toValue: 0, useNativeDriver: false, tension: 80, friction: 10 }),
        Animated.timing(dotsOpacity, { toValue: 1, duration: 400, useNativeDriver: false }),
      ]),

      // Phase 8: Truck drives away to the right
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(truckX, {
          toValue: W + 160,
          duration: 700,
          useNativeDriver: false,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(truckBounce, { toValue: -3, duration: 110, useNativeDriver: false }),
            Animated.timing(truckBounce, { toValue: 0, duration: 110, useNativeDriver: false }),
          ]),
          { iterations: 4 }
        ),
      ]),

      // Phase 9: Exit
      Animated.delay(200),
      Animated.timing(exitOpacity, { toValue: 0, duration: 550, useNativeDriver: false }),
    ]).start(() => onFinish());
  }, []);

  // Interpolated underline width (0→1 fraction → pixel width)
  const underlinePixels = underlineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <Animated.View style={[styles.root, { opacity: exitOpacity }]} pointerEvents="none">
      {/* Background gradient */}
      <LinearGradient
        colors={["#060E2B", "#0F1F5C", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating particles */}
      <Animated.View style={[styles.particle, styles.p1, { transform: [{ translateY: particle1Y }] }]} />
      <Animated.View style={[styles.particle, styles.p2, { transform: [{ translateY: particle2Y }] }]} />
      <Animated.View style={[styles.particle, styles.p3, { transform: [{ translateY: particle3Y }] }]} />

      {/* Center content */}
      <View style={styles.center}>

        {/* ---- TRUCK SCENE ---- */}
        <View style={styles.truckScene}>
          {/* Road */}
          <Animated.View style={[styles.road, { width: roadWidth }]}>
            {/* Road dashes */}
            <Animated.View style={[styles.roadDashes, { transform: [{ translateX: roadLineX }] }]}>
              {[...Array(12)].map((_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </Animated.View>
          </Animated.View>

          {/* Truck + exhaust */}
          <Animated.View
            style={[
              styles.truckWrapper,
              {
                transform: [
                  { translateX: truckX },
                  { translateY: truckBounce },
                  { scale: truckHonk },
                ],
              },
            ]}
          >
            {/* Exhaust cloud */}
            <Animated.View
              style={[
                styles.exhaust,
                {
                  opacity: exhaustOpacity,
                  transform: [{ scale: exhaustScale }],
                },
              ]}
            >
              <Text style={styles.exhaustEmoji}>💨</Text>
            </Animated.View>

            {/* SVG Truck — always faces right, no font dependency */}
            <View style={styles.truckIconWrapper}>
              <Svg width={110} height={60} viewBox="0 0 110 60">
                {/* Trailer / cargo body */}
                <Rect x="0" y="5" width="65" height="32" rx="3" fill="#FBBF24" />
                {/* Cab */}
                <Path
                  d="M65 37 L65 8 Q66 3 72 3 L100 3 Q110 3 110 16 L110 37 Z"
                  fill="#F59E0B"
                />
                {/* Windshield */}
                <Rect x="73" y="6" width="28" height="20" rx="2" fill="#BAE6FD" opacity="0.85" />
                {/* Door line */}
                <Rect x="73" y="27" width="18" height="9" rx="1" fill="#D97706" />
                {/* Front bumper */}
                <Rect x="104" y="30" width="6" height="7" rx="1" fill="#92400E" />
                {/* Rear bumper */}
                <Rect x="0" y="32" width="5" height="5" rx="1" fill="#92400E" />
                {/* Exhaust pipe on trailer */}
                <Rect x="3" y="-2" width="5" height="10" rx="2" fill="#9CA3AF" />
                {/* Rear wheel */}
                <Circle cx="18" cy="44" r="13" fill="#1E293B" />
                <Circle cx="18" cy="44" r="5" fill="#64748B" />
                {/* Front wheel */}
                <Circle cx="88" cy="44" r="13" fill="#1E293B" />
                <Circle cx="88" cy="44" r="5" fill="#64748B" />
                {/* Ground line / undercarriage */}
                <Rect x="0" y="37" width="110" height="2" rx="1" fill="#92400E" opacity="0.4" />
              </Svg>
            </View>
          </Animated.View>
        </View>

        {/* ---- FAYAGE LETTERS ---- */}
        <View style={styles.lettersRow}>
          {LETTERS.map((letter, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                {
                  opacity: letterAnims[i].opacity,
                  transform: [
                    { translateX: letterAnims[i].translateX },
                    { scale: letterAnims[i].scale },
                  ],
                },
              ]}
            >
              {letter}
            </Animated.Text>
          ))}
        </View>

        {/* Animated underline */}
        <Animated.View style={[styles.underline, { width: underlinePixels }]} />

        {/* Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: tagOpacity,
              transform: [{ translateY: tagY }],
            },
          ]}
        >
          Transport rapide et fiable
        </Animated.Text>

        {/* Decorative dots */}
        <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === 2 && styles.dotCenter,
              ]}
            />
          ))}
        </Animated.View>
      </View>

      {/* Bottom badge */}
      <Animated.Text style={[styles.bottomLabel, { opacity: tagOpacity }]}>
        Maroc 🇲🇦
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  /* Floating particles */
  particle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  p1: { width: 300, height: 300, top: -80, right: -80 },
  p2: { width: 180, height: 180, bottom: 80, left: -50 },
  p3: { width: 100, height: 100, top: H * 0.38, right: 20 },

  center: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },

  /* Truck scene */
  truckScene: {
    width: W,
    height: 90,
    justifyContent: "flex-end",
    overflow: "hidden",
    marginBottom: 8,
  },
  road: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 5,
    overflow: "hidden",
  },
  roadDashes: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 16,
    position: "absolute",
    top: 3,
    left: 0,
  },
  dash: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  truckWrapper: {
    position: "absolute",
    bottom: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  exhaust: {
    position: "absolute",
    left: -28,
    bottom: 16,
  },
  exhaustEmoji: {
    fontSize: 22,
  },
  truckIconWrapper: {
    width: 110,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Letters */
  lettersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  letter: {
    fontSize: 54,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    textShadowColor: "rgba(59,130,246,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  /* Underline */
  underline: {
    height: 3,
    backgroundColor: "#F59E0B",
    borderRadius: 2,
    marginTop: -8,
  },

  /* Tagline */
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginTop: 4,
  },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotCenter: {
    width: 22,
    height: 5,
    backgroundColor: "#F59E0B",
    borderRadius: 3,
  },

  bottomLabel: {
    position: "absolute",
    bottom: 50,
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    letterSpacing: 1,
  },
});
