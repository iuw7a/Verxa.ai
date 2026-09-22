import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

const LOGO = require("../../assets/images/icon.png");

/** Round Verxa mark used in headers and the drawer. */
export function VerxaMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size, borderRadius: size * 0.24 }}
      resizeMode="cover"
    />
  );
}

/** Wordmark row: mark + "Verxa AI". */
export function VerxaWordmark({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.wordmark}>
      <VerxaMark size={size} />
      <Text style={[styles.word, { fontSize: size * 0.78 }]}>
        Verxa<Text style={styles.ai}> AI</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  word: {
    color: colors.text,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  ai: {
    color: colors.textMuted,
    fontWeight: "400",
  },
});
