import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { Screen, Title, Subtitle, Card, PrimaryButton, Badge } from "@/components/ui";
import { Sparkles } from "lucide-react-native";
import { spacing } from "@/lib/theme";

export default function PlansScreen() {
  return (
    <Screen>
      <Title>Plans</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Manage your Verxa subscription.
      </Subtitle>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
          <Sparkles size={18} color="#8ea4ff" />
          <Badge tone="accent">Verxa AI</Badge>
        </View>
        <Subtitle style={{ lineHeight: 22 }}>
          Image and video generation, eight chat models, live web search and
          cross-device sync — included with your account.
        </Subtitle>
        <PrimaryButton
          label="Manage subscription on verxa.de"
          onPress={() => void Linking.openURL("https://www.verxa.de/account/subscription")}
          style={{ marginTop: spacing.lg }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({});
