import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VoiceCallScreen() {
  const navigation = useNavigation();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Icon name="phone-off" size={48} color="#94A3B8" />
      <ThemedText style={styles.title}>{t("voiceCallNotSupported") ?? "Appel non disponible"}</ThemedText>
      <ThemedText style={styles.sub}>{t("voiceCallWebOnly") ?? "Les appels vocaux nécessitent l'application mobile."}</ThemedText>
      <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
        <ThemedText style={styles.btnText}>{t("back") ?? "Retour"}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    gap: 16,
    padding: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F1F5F9",
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: "#1E3A5F",
    borderRadius: 12,
  },
  btnText: {
    color: "#60A5FA",
    fontWeight: "600",
    fontSize: 15,
  },
});
