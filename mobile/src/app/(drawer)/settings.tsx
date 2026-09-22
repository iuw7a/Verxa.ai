import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Screen, Title, Subtitle, Card, RowItem, Badge, Segmented } from "@/components/ui";
import { useApp } from "@/providers/app-provider";
import { spacing } from "@/lib/theme";

const SECTIONS = [
  { key: "profile", label: "Profile" },
  { key: "appearance", label: "Appearance" },
  { key: "memory", label: "Memory" },
  { key: "security", label: "Security" },
  { key: "notifications", label: "Notifications" },
  { key: "help", label: "Help" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<SectionKey>("profile");
  const { session, profile } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (params.section && SECTIONS.some((s) => s.key === params.section)) {
      setSection(params.section as SectionKey);
    }
  }, [params.section]);

  return (
    <Screen>
      <Title>Settings</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.md }}>
        Appearance, memory, security
      </Subtitle>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {SECTIONS.map((s) => (
          <Pressable key={s.key} onPress={() => setSection(s.key)}>
            <Badge tone={section === s.key ? "accent" : "neutral"}>{s.label}</Badge>
          </Pressable>
        ))}
      </ScrollView>

      {section === "profile" ? (
        <Card>
          <RowItem icon="user" label="Username" sub={profile?.username ?? "Not set"} />
          <RowItem icon="mail" label="Email" sub={session?.email ?? "—"} />
          <RowItem
            icon="check"
            label="Email confirmed"
            sub={session?.email ? "Verified at sign-in" : "—"}
          />
        </Card>
      ) : null}

      {section === "appearance" ? (
        <Card>
          <Subtitle style={{ marginBottom: spacing.sm }}>Theme</Subtitle>
          <Segmented
            options={[
              { key: "dark", label: "Dark" },
              { key: "trueblack", label: "True black" },
            ]}
            value="dark"
          />
          <RowItem icon="palette" label="Accent" sub="Verxa blue" />
        </Card>
      ) : null}

      {section === "memory" ? (
        <Card>
          <RowItem
            icon="brain"
            label="Memory"
            sub="Managed on verxa.de/account/memory"
          />
        </Card>
      ) : null}

      {section === "security" ? (
        <Card>
          <RowItem
            icon="shield"
            label="Password & sessions"
            sub="Managed on verxa.de/account/security"
          />
          <RowItem icon="link" label="Connected services" sub="Google & more" />
        </Card>
      ) : null}

      {section === "notifications" ? (
        <Card>
          <RowItem icon="bell" label="Push notifications" sub="In-app only in this release" />
        </Card>
      ) : null}

      {section === "help" ? (
        <Card>
          <RowItem icon="help" label="Help center" sub="verxa.de/account/help" />
        </Card>
      ) : null}

      <Pressable onPress={() => router.push("/account")} style={{ marginTop: spacing.md }}>
        <Subtitle style={{ color: "#8ea4ff" }}>Go to Account →</Subtitle>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, marginBottom: spacing.md, paddingRight: spacing.lg },
});
