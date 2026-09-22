import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
  type TextStyle,
  type TextProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  User as UserIcon,
  Mail as MailIcon,
  Check as CheckIcon,
  Palette as PaletteIcon,
  Brain as BrainIcon,
  Shield as ShieldIcon,
  Bell as BellIcon,
  Plug as PlugIcon,
  Sparkles as SparklesIcon,
  HelpCircle as HelpIcon,
  Link as LinkIcon,
  MessageSquare as MessageIcon,
  Image as ImageIcon,
  FileText as FileIcon,
} from "lucide-react-native";
import { colors, radii, spacing } from "@/lib/theme";

// ---------- Screen scaffold ----------

export function Screen({
  children,
  scroll = true,
  pad = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  pad?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const inner = [styles.screenInner, pad && { paddingHorizontal: spacing.lg }, style];
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={inner}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </View>
  );
}

// ---------- Text ----------

export function Title({ children, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.title, rest.style]}>{children}</Text>;
}

export function Subtitle({ children, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.subtitle, rest.style]}>{children}</Text>;
}

export function Body({ children, ...rest }: TextProps) {
  return <Text {...rest} style={[styles.body, rest.style]}>{children}</Text>;
}

export function Caption({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.caption, style]}>{children}</Text>;
}

// ---------- Surfaces ----------

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

// ---------- Buttons ----------

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && { opacity: 0.45 },
        pressed && !disabled && { transform: [{ scale: 0.985 }], backgroundColor: colors.accentStrong },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.onAccent} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.outlineBtn,
        disabled && { opacity: 0.45 },
        pressed && { backgroundColor: "rgba(255,255,255,0.06)" },
        style,
      ]}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </Pressable>
  );
}

// ---------- Inputs ----------

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

// ---------- Misc ----------

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "ok" | "danger";
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === "accent" && { borderColor: "rgba(142,164,255,0.3)", backgroundColor: colors.accentSoft },
        tone === "ok" && { borderColor: "rgba(125,206,160,0.3)", backgroundColor: "rgba(125,206,160,0.1)" },
        tone === "danger" && { borderColor: "rgba(240,113,120,0.3)", backgroundColor: "rgba(240,113,120,0.1)" },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "accent" && { color: colors.accentStrong },
          tone === "ok" && { color: colors.ok },
          tone === "danger" && { color: colors.danger },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

export function Spinner({ size = "small" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color={colors.accent} />;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange?: (key: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange?.(o.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RowItem({
  icon,
  label,
  sub,
  onPress,
  right,
}: {
  icon?: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const Icon: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    user: UserIcon,
    mail: MailIcon,
    check: CheckIcon,
    palette: PaletteIcon,
    brain: BrainIcon,
    shield: ShieldIcon,
    bell: BellIcon,
    plug: PlugIcon,
    sparkles: SparklesIcon,
    help: HelpIcon,
    link: LinkIcon,
    message: MessageIcon,
    image: ImageIcon,
    file: FileIcon,
  };
  const IconCmp = icon ? Icon[icon] : undefined;
  const inner = (
    <>
      {IconCmp ? <IconCmp size={17} color={colors.accent} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, onPress == null && styles.rowLabelStatic]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </>
  );
  if (!onPress) return <View style={styles.row}>{inner}</View>;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "rgba(255,255,255,0.04)" }]}
    >
      {inner}
    </Pressable>
  );
}

export function PressableRow({
  icon,
  label,
  sub,
  onPress,
  right,
  destructive,
}: {
  icon?: React.ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
  right?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: "rgba(255,255,255,0.04)" }]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, destructive && { color: colors.danger }]} numberOfLines={1}>
          {label}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
}) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenInner: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    color: colors.textFaint,
    fontSize: 12.5,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionHeader: {
    color: colors.textFaint,
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryBtnText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "600",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: radii.md,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  outlineBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.032)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  rowLabelStatic: {
    fontWeight: "600",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radii.md,
    padding: 3,
    gap: 2,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.cardHi,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  segmentTextActive: {
    color: colors.text,
  },
  rowSub: {
    color: colors.textFaint,
    fontSize: 12.5,
    marginTop: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 20,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
