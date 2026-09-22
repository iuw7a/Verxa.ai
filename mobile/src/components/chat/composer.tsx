import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ArrowUp, Square, ImageIcon, Clapperboard, MessageCircle, Wrench } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, spacing } from "@/lib/theme";
import { useApp, type GenMode } from "@/providers/app-provider";

const MODES: { id: GenMode; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Clapperboard },
  { id: "tools", label: "Tools", icon: Wrench },
];

export function Composer() {
  const { send, stop, streaming, genMode, setGenMode } = useApp();
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  const submit = () => {
    const t = text.trim();
    if (!t || streaming) return;
    setText("");
    inputRef.current?.blur();
    void send(t);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: spacing.md + insets.bottom }]}>
      {/* Generation mode chips */}
      <View style={styles.modeRow}>
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = genMode === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => setGenMode(m.id)}
              style={[styles.modeChip, active && styles.modeChipActive]}
              activeOpacity={0.7}
            >
              <Icon size={13} color={active ? colors.accentStrong : colors.textMuted} />
              <Text style={[styles.modeText, active && { color: colors.accentStrong }]}>{m.label}</Text>
            </TouchableOpacity>
          );
        })}
        {genMode !== "chat" && (
          <Text style={styles.modeHint}>
            {genMode === "image" ? "generates an image" : genMode === "video" ? "generates a video" : "web search + tools"}
          </Text>
        )}
      </View>

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={genMode === "chat" ? "Message Verxa…" : `Describe the ${genMode === "image" ? "image" : genMode === "video" ? "video" : "task"}…`}
          placeholderTextColor={colors.textFaint}
          value={text}
          onChangeText={setText}
          multiline
          editable={!streaming}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={submit}
        />
        <TouchableOpacity
          onPress={streaming ? stop : submit}
          disabled={!streaming && text.trim().length === 0}
          style={[styles.sendBtn, (!streaming && text.trim().length === 0) && styles.sendDisabled]}
          activeOpacity={0.8}
        >
          {streaming ? (
            <Square size={14} color={colors.onAccent} fill={colors.onAccent} />
          ) : (
            <ArrowUp size={17} color={colors.onAccent} strokeWidth={2.6} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexWrap: "wrap",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  modeChipActive: {
    borderColor: "rgba(142,164,255,0.4)",
    backgroundColor: colors.accentSoft,
  },
  modeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  modeHint: {
    color: colors.textFaint,
    fontSize: 11,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 11,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.35,
  },
});
