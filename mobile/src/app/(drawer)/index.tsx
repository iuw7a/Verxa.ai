import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { ImageIcon, Clapperboard, GraduationCap } from "lucide-react-native";
import { ChatView } from "@/components/chat/chat-view";
import { colors, radii, spacing } from "@/lib/theme";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ChatView />
      <QuickActions onOpen={(dest) => router.push(dest as never)} />
    </View>
  );
}

function QuickActions({ onOpen }: { onOpen: (dest: string) => void }) {
  return (
    <View style={styles.row}>
      {[
        { label: "Learn", icon: GraduationCap, dest: "/(drawer)/learn" },
        { label: "Image", icon: ImageIcon, dest: "/(drawer)/library" },
        { label: "Video", icon: Clapperboard, dest: "/(drawer)/library" },
      ].map((a) => {
        const Icon = a.icon;
        return (
          <TouchableOpacity key={a.label} style={styles.chip} activeOpacity={0.7} onPress={() => onOpen(a.dest)}>
            <Icon size={14} color={colors.accent} />
            <Text style={styles.chipText}>{a.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: 108,
    pointerEvents: "box-none",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: "600",
  },
});
