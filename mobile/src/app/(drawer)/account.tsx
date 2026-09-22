import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Subtitle, Card, RowItem } from "@/components/ui";
import { useApp } from "@/providers/app-provider";
import { spacing } from "@/lib/theme";

export default function AccountScreen() {
  const { session, profile, signOut } = useApp();
  const router = useRouter();

  return (
    <Screen>
      <Title>Account</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        {profile?.username ?? session?.email?.split("@")[0] ?? "Verxa user"}
      </Subtitle>

      <Card style={{ marginBottom: spacing.md }}>
        <RowItem
          icon="user"
          label="Profile"
          sub={profile?.username ? `@${profile.username}` : "Set your username"}
          onPress={() => router.push("/settings?section=profile")}
        />
        <RowItem
          icon="shield"
          label="Security"
          sub={session?.email ?? ""}
          onPress={() => router.push("/settings?section=security")}
        />
        <RowItem
          icon="brain"
          label="Memory"
          sub="What Verxa remembers"
          onPress={() => router.push("/settings?section=memory")}
        />
        <RowItem
          icon="palette"
          label="Appearance"
          sub="Dark · Verxa accent"
          onPress={() => router.push("/settings?section=appearance")}
        />
        <RowItem
          icon="bell"
          label="Notifications"
          sub="In-app only in this release"
          onPress={() => router.push("/settings?section=notifications")}
        />
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <RowItem
          icon="plug"
          label="Connected services & plugins"
          sub="Manage integrations"
          onPress={() => router.push("/plugins")}
        />
        <RowItem
          icon="sparkles"
          label="Subscription"
          sub="Manage on verxa.de"
          onPress={() => router.push("/plans")}
        />
        <RowItem
          icon="help"
          label="Help"
          sub="Support & documentation"
          onPress={() => router.push("/settings?section=help")}
        />
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={({ pressed }) => [
          styles.signOut,
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Subtitle style={{ color: "#ff8a8a", fontWeight: "600" }}>Sign out</Subtitle>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  signOut: {
    backgroundColor: "rgba(255,120,120,0.08)",
    borderColor: "rgba(255,120,120,0.22)",
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.md,
  },
});
