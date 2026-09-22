import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import {
  MessageSquarePlus,
  Search,
  Images,
  FolderKanban,
  Puzzle,
  CreditCard,
  GraduationCap,
  Code2,
  Settings,
  UserRound,
  LogOut,
} from "lucide-react-native";
import { VerxaWordmark, VerxaMark } from "./logo";
import { colors, radii, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";

const DESTS = [
  { route: "(drawer)/search", label: "Search", icon: Search },
  { route: "(drawer)/library", label: "Library", icon: Images },
  { route: "(drawer)/projects", label: "Projects", icon: FolderKanban },
  { route: "(drawer)/plugins", label: "Plugins", icon: Puzzle },
  { route: "(drawer)/plans", label: "Plans", icon: CreditCard },
  { route: "(drawer)/codex", label: "Codex", icon: Code2 },
  { route: "(drawer)/learn", label: "Learn", icon: GraduationCap },
  { route: "(drawer)/settings", label: "Settings", icon: Settings },
  { route: "(drawer)/account", label: "Account", icon: UserRound },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const { chats, session, signOut } = useApp();
  const recent = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  const name = session?.email?.split("@")[0] ?? "Guest";

  const go = (route: string) => {
    props.navigation.navigate(route as never);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <VerxaWordmark size={24} />
      </View>

      <TouchableOpacity
        style={styles.newChat}
        activeOpacity={0.8}
        onPress={() => go("(drawer)/index")}
      >
        <MessageSquarePlus size={17} color={colors.onAccent} />
        <Text style={styles.newChatText}>New Chat</Text>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: spacing.md }}>
          {DESTS.map((d) => {
            const Icon = d.icon;
            const focused = props.state.routeNames[props.state.index] === d.route.split("/")[1];
            return (
              <TouchableOpacity
                key={d.route}
                style={[styles.item, focused && styles.itemActive]}
                activeOpacity={0.7}
                onPress={() => go(d.route)}
              >
                <Icon size={17} color={focused ? colors.accentStrong : colors.textMuted} />
                <Text style={[styles.itemText, focused && { color: colors.text }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.section}>Recent</Text>
        <View style={{ paddingHorizontal: spacing.md }}>
          {recent.length === 0 ? (
            <Text style={styles.recentEmpty}>Your conversations will appear here.</Text>
          ) : (
            recent.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.chatItem}
                activeOpacity={0.7}
                onPress={() => go("(drawer)/chat")}
              >
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {c.title}
                </Text>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {c.preview || "—"}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerUser}>
          <VerxaMark size={30} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.footerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.footerSub}>{session ? "Signed in" : "Guest"}</Text>
          </View>
          {session ? (
            <TouchableOpacity onPress={() => void signOut()} hitSlop={12}>
              <LogOut size={17} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => go("(drawer)/auth")} hitSlop={12}>
              <Text style={styles.signIn}>Sign in</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.sidebar,
    paddingTop: 54,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  newChat: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    height: 44,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  newChatText: {
    color: colors.onAccent,
    fontWeight: "600",
    fontSize: 14.5,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  itemActive: {
    backgroundColor: colors.accentSoft,
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 14.5,
    fontWeight: "500",
  },
  section: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  recentEmpty: {
    color: colors.textFaint,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    lineHeight: 19,
  },
  chatItem: {
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  chatTitle: {
    color: colors.text,
    fontSize: 13.5,
  },
  chatPreview: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: 20,
  },
  footerUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  footerName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  footerSub: {
    color: colors.textFaint,
    fontSize: 12,
  },
  signIn: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 13.5,
  },
});
