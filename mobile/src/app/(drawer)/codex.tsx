import React from "react";
import { StyleSheet, Text } from "react-native";
import { Screen, Title, Subtitle, Card, Badge } from "@/components/ui";
import { Code2 } from "lucide-react-native";
import { colors, spacing } from "@/lib/theme";

/**
 * Codex — the backend capability is not finished on verxa.de yet.
 * The screen is intentionally wired as a shell: when the API ships, plug it
 * into the same chat stream pipeline (see src/lib/api.ts) without redesign.
 */
export default function CodexScreen() {
  return (
    <Screen>
      <Title>Codex</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Code-focused AI workspace.
      </Subtitle>

      <Card>
        <Badge tone="accent">Coming with the next release</Badge>
        <Subtitle style={{ marginTop: spacing.md, lineHeight: 22 }}>
          Codex will give chat a dedicated code mode: repositories, long
          context, diffs and runnable snippets.
        </Subtitle>
        <Text style={styles.note}>
          The mobile architecture is ready — it will connect to the same
          streaming pipeline as chat the moment the backend endpoint goes live.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.textFaint,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.md,
  },
});
