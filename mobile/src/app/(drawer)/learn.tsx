import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Screen, Title, Subtitle, Input, PrimaryButton, Card } from "@/components/ui";
import { MessageBubble } from "@/components/chat/message-bubble";
import { colors, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";
import type { ChatMessage } from "@/lib/store";
import { id as newId } from "@/lib/store";

const EXAMPLES = ["Photosynthesis", "The French Revolution", "How neural networks learn", "Pythagorean theorem"];

export default function LearnScreen() {
  const { send, streaming } = useApp();
  const [topic, setTopic] = useState("");
  const [lesson, setLesson] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(false);

  async function teach(t: string) {
    const clean = t.trim();
    if (!clean || loading) return;
    setTopic(clean);
    setLoading(true);
    setLesson({ id: newId(), role: "assistant", content: "", createdAt: Date.now() });
    // Reuse the app-level send pipeline but capture output locally:
    // simpler + reliable → call streamChat directly here.
    const { streamChat } = await import("@/lib/api");
    let assembled = "";
    try {
      await streamChat(
        {
          messages: [
            {
              role: "user",
              content:
                `Explain "${clean}" for a student. Structure it with short sections: a one-sentence summary, the key ideas as a list, a simple analogy, and 3 quick check questions. Keep it mobile-friendly and clear.`,
            },
          ],
          enableSearch: true,
        },
        (e) => {
          if (e.type === "delta") {
            assembled += e.text;
            setLesson({ id: newId(), role: "assistant", content: assembled, createdAt: Date.now() });
          } else if (e.type === "error") {
            setLesson({ id: newId(), role: "assistant", content: assembled || e.message, createdAt: Date.now() });
          }
        },
      );
    } catch (err) {
      setLesson({ id: newId(), role: "assistant", content: (err as Error).message, createdAt: Date.now() });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Learn</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Enter a school topic — Verxa explains it step by step.
      </Subtitle>

      <View style={styles.form}>
        <Input
          placeholder="e.g. Photosynthesis, WW2, linear equations…"
          value={topic}
          onChangeText={setTopic}
          onSubmitEditing={() => void teach(topic)}
          returnKeyType="go"
          editable={!loading}
        />
        <PrimaryButton label="Explain it" onPress={() => void teach(topic)} loading={loading} disabled={!topic.trim()} style={{ marginTop: spacing.md }} />
      </View>

      {!lesson ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Subtitle>Try one of these:</Subtitle>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {EXAMPLES.map((ex) => (
              <Card key={ex} style={{ padding: spacing.md }} onPress={() => void teach(ex)}>
                <Subtitle style={{ color: colors.accentStrong }}>{ex}</Subtitle>
              </Card>
            ))}
          </View>
        </Card>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: spacing.lg }}>
          <MessageBubble message={lesson} streaming={loading} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    marginTop: spacing.xs,
  },
});
