import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen, Title, Subtitle, Input, PrimaryButton } from "@/components/ui";
import { VerxaMark } from "@/components/logo";
import { useApp } from "@/providers/app-provider";
import { colors, spacing } from "@/lib/theme";

export default function AuthScreen() {
  const { signIn, signUp, session } = useApp();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || !email.trim() || password.length < 6) return;
    setBusy(true);
    setError(null);
    const err = mode === "signin" ? await signIn(email.trim(), password) : await signUp(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <VerxaMark size={40} />
      </View>
      <Title style={{ textAlign: "center" }}>Verxa AI</Title>
      <Subtitle style={{ textAlign: "center", marginTop: 6, marginBottom: spacing.xl }}>
        {mode === "signin"
          ? "Sign in to sync chats across devices."
          : "Create your account — same login as verxa.de."}
      </Subtitle>

      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!busy}
        style={{ marginBottom: spacing.md }}
      />
      <Input
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!busy}
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
      />

      {error ? (
        <Subtitle style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Subtitle>
      ) : null}

      <PrimaryButton
        label={mode === "signin" ? "Sign in" : "Create account"}
        onPress={() => void submit()}
        loading={busy}
        disabled={!email.trim() || password.length < 6}
        style={{ marginTop: spacing.lg }}
      />

      <Pressable onPress={() => setMode(mode === "signin" ? "signup" : "signin")} hitSlop={8}>
        <Subtitle style={{ textAlign: "center", marginTop: spacing.lg, color: colors.accent }}>
          {mode === "signin" ? "No account? Sign up" : "Already have an account? Sign in"}
        </Subtitle>
      </Pressable>

      {session ? (
        <Subtitle style={{ textAlign: "center", marginTop: spacing.md, color: colors.ok }}>
          Signed in as {session.email}
        </Subtitle>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
});
