import React, { useEffect, useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";
import { MessageBubble } from "./message-bubble";
import { Composer } from "./composer";
import { mediaUrl } from "@/lib/api";
import { VerxaMark } from "@/components/logo";

/**
 * Full-screen chat surface used by Home (new chat) and the Chat screen.
 * Keyboard behavior: iOS pushes via KeyboardAvoidingView; Android relies on
 * softwareKeyboardLayoutMode=resize + keyboard-controller.
 */
export function ChatView() {
  const { chats, streaming, session } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const active = chats.find((c) => c.messages.length > 0) ?? chats[0];
  const messages = active?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.flex}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <VerxaMark size={24} />
          <Text style={styles.headerTitle}>{active?.title && active.title !== "New chat" ? active.title : "Verxa AI"}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <Welcome email={session?.email} />
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
              />
            ))
          )}
          {streaming && messages[messages.length - 1]?.content ? null : null}
        </ScrollView>

        {/* Generated media (latest image result) */}
        <Composer />
      </View>
    </KeyboardAvoidingView>
  );
}

function Welcome({ email }: { email?: string | null }) {
  const name = email?.split("@")[0];
  return (
    <View style={styles.welcome}>
      <VerxaMark size={44} />
      <Text style={styles.welcomeTitle}>{name ? `Hello, ${name}` : "Hello"}</Text>
      <Text style={styles.welcomeSub}>Ask anything — or switch to Image, Video or Tools below.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15.5,
    fontWeight: "600",
    maxWidth: "60%",
  },
  messages: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  welcome: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: 120,
  },
  welcomeTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  welcomeSub: {
    color: colors.textMuted,
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: spacing.xl,
  },
});
