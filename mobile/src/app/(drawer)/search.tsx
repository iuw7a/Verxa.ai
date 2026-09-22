import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, Title, Subtitle, Input, Card, EmptyState, Body } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";

export default function SearchScreen() {
  const { chats } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return chats
      .map((c) => {
        const inTitle = c.title.toLowerCase().includes(needle);
        const hit = c.messages.find((m) => m.content.toLowerCase().includes(needle));
        if (!inTitle && !hit) return null;
        return {
          chat: c,
          snippet: hit?.content.slice(0, 120) ?? c.preview,
        };
      })
      .filter(Boolean) as { chat: (typeof chats)[number]; snippet: string }[];
  }, [chats, q]);

  return (
    <Screen>
      <Title>Search</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Find anything across your conversations.
      </Subtitle>

      <Input placeholder="Search chats…" value={q} onChangeText={setQ} autoCorrect={false} />

      <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.md }}>
        {q.trim() === "" ? (
          <EmptyState title="Search your history" text="Titles and message contents are searched on-device." />
        ) : results.length === 0 ? (
          <EmptyState title="No matches" text={`Nothing found for "${q.trim()}".`} />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {results.map(({ chat, snippet }) => (
              <Card key={chat.id} onPress={() => router.push("/(drawer)/chat")}>
                <Body style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>
                  {chat.title}
                </Body>
                <Subtitle style={{ marginTop: 4 }} numberOfLines={2}>
                  {snippet}
                </Subtitle>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({});
