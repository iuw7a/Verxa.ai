import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, View } from "react-native";
import { Screen, Title, Subtitle, Card, Badge, EmptyState, PressableRow, Divider } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";
import { fetchPlugins, type PluginInfo } from "@/lib/api";
import { ChevronRight } from "lucide-react-native";

export default function PluginsScreen() {
  const { session } = useApp();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPlugins(await fetchPlugins());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openConnect(p: PluginInfo) {
    // Connect flow is OAuth-based → happens on the web app; deep-link there.
    await Linking.openURL(`https://www.verxa.de/plugins?connect=${p.id}`);
  }

  return (
    <Screen>
      <Title>Plugins</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Connect Google and other services — chat can then use them as tools.
      </Subtitle>

      {!session ? (
        <EmptyState title="Sign in to manage plugins" text="Connections are tied to your Verxa account." />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <EmptyState title="Could not load plugins" text={error} />
      ) : plugins.length === 0 ? (
        <EmptyState title="No plugins available" text="The catalog is empty on this deployment." />
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {plugins.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <Divider />}
              <PressableRow
                label={p.name}
                sub={p.accountLabel ? `${p.tagline} · ${p.accountLabel}` : p.tagline}
                onPress={() => void openConnect(p)}
                right={
                  p.connected ? (
                    <Badge tone="ok">Connected</Badge>
                  ) : p.configured ? (
                    <ChevronRight size={16} color={colors.textFaint} />
                  ) : (
                    <Badge tone="neutral">Soon</Badge>
                  )
                }
              />
            </View>
          ))}
        </Card>
      )}

      <Text style={styles.note}>
        Permissions are read-only by design. Connecting opens the secure OAuth flow on verxa.de and returns here.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.textFaint,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
});
