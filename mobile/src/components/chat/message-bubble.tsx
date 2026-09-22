import React, { useMemo } from "react";
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import RenderHTML from "react-native-render-html";
import { useWindowDimensions } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";
import { mediaUrl } from "@/lib/api";
import type { ChatMessage } from "@/lib/store";

// Lightweight markdown → HTML (no heavy parser dependency in Expo Go).
function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = esc(md);

  // fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    return `<pre data-lang="${lang}"><code>${code.replace(/\n$/, "")}</code></pre>`;
  });
  // inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|\W)\*([^*\n]+)\*(?=\W|$)/g, "$1<em>$2</em>");
  // links
  html = html.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  // blockquote
  html = html.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
  // unordered lists
  html = html.replace(/(?:^[-*] .*(?:\n|$))+/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^[-*] /, "")}</li>`).join("");
    return `<ul>${items}</ul>`;
  });
  // ordered lists
  html = html.replace(/(?:^\d+\. .*(?:\n|$))+/gm, (block) => {
    const items = block.trim().split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
    return `<ol>${items}</ol>`;
  });
  // tables (GFM simple: | a | b | rows)
  html = html.replace(
    /(?:^\|.*\|$\n?)+/gm,
    (block) => {
      const rows = block.trim().split("\n").filter((r) => !/^\|[\s:|-]+\|$/.test(r));
      if (rows.length === 0) return block;
      const cells = rows.map((r) => r.split("|").slice(1, -1).map((c) => c.trim()));
      const [head, ...body] = cells;
      const th = head.map((c) => `<th>${c}</th>`).join("");
      const tb = body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      return `<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
    },
  );
  // paragraphs (remaining double newlines)
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, "");
  return html;
}


export function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming?: boolean;
}) {
  const { width } = useWindowDimensions();
  const html = useMemo(() => mdToHtml(message.content), [message.content]);

  if (message.role === "user") {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  const generating =
    message.media?.state === "generating" || (!message.content && streaming);
  const mediaFailed = message.media?.state === "error";

  return (
    <View style={styles.aiRow}>
      {message.media?.state === "generating" ? (
        <View style={styles.mediaGenerating}>
          <View style={styles.dot} />
          <Text style={styles.mediaGeneratingText}>
            Generating {message.media.kind}…
          </Text>
        </View>
      ) : null}
      {mediaFailed ? (
        <View style={styles.mediaGenerating}>
          <Text style={[styles.mediaGeneratingText, { color: colors.danger }]}>
            {message.media?.error ?? "Generation failed."}
          </Text>
        </View>
      ) : null}
      {message.media?.url && !mediaFailed ? (
        message.media.kind === "image" ? (
          <Image
            source={{ uri: mediaUrl(message.media.url) }}
            style={styles.mediaImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.mediaNote}>🎬 Video ready — open in Library to play.</Text>
        )
      ) : null}
      {message.content ? (
        <RenderHTML
          contentWidth={width - 56}
          source={{ html }}
          baseStyle={styles.aiBase}
          tagsStyles={{
            p: styles.paragraph,
            h1: styles.h1,
            h2: styles.h2,
            h3: styles.h3,
            li: styles.listItem,
            code: styles.inlineCode,
            pre: styles.pre,
            blockquote: styles.quote,
            a: styles.link,
            table: styles.table,
            th: styles.th,
            td: styles.td,
            strong: { color: colors.text, fontWeight: "600" },
          }}
          renderersProps={{
            a: {
              onPress: (_e: unknown, href: string) => {
                void Linking.openURL(href);
                return false;
              },
            },
          }}
        />
      ) : generating ? (
        <View style={styles.thinkingRow}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      ) : null}
      {message.sources?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sources}>
          {message.sources.slice(0, 5).map((s) => (
            <TouchableOpacity
              key={s.url}
              style={styles.sourceChip}
              activeOpacity={0.7}
              onPress={() => void Linking.openURL(s.url)}
            >
              <Text style={styles.sourceTitle} numberOfLines={1}>
                {s.title}
              </Text>
              <Text style={styles.sourceUrl} numberOfLines={1}>
                {s.url.replace(/^https?:\/\//, "").split("/")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      {streaming && message.content ? <View style={styles.caret} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderRadius: radii.xl,
    borderBottomRightRadius: 8,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 10,
    maxWidth: "82%",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  userText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  aiRow: {
    marginBottom: spacing.lg,
  },
  aiBase: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  paragraph: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 0,
    marginBottom: 8,
  },
  h1: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  h2: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  h3: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  listItem: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 2,
  },
  inlineCode: {
    color: colors.accentStrong,
    backgroundColor: "rgba(255,255,255,0.07)",
    fontSize: 13.5,
    fontFamily: "Menlo",
  },
  pre: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: 8,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
    color: colors.textMuted,
    marginBottom: 8,
  },
  link: {
    color: colors.accent,
    textDecorationLine: "none",
  },
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.sm,
    marginBottom: 8,
  },
  th: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 13,
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  td: {
    color: colors.text,
    fontSize: 13,
    padding: 6,
  },
  thinkingRow: {
    flexDirection: "row",
    gap: 5,
    paddingVertical: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    opacity: 0.4,
  },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  sources: {
    marginTop: spacing.xs,
  },
  sourceChip: {
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 200,
    marginRight: spacing.sm,
  },
  sourceTitle: {
    color: colors.text,
    fontSize: 12.5,
  },
  sourceUrl: {
    color: colors.textFaint,
    fontSize: 10.5,
    marginTop: 1,
  },
  caret: {
    width: 8,
    height: 16,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginTop: -14,
    marginBottom: 6,
  },
  mediaNote: {
    color: colors.textMuted,
    fontSize: 13.5,
    marginBottom: 6,
  },
  mediaImage: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: spacing.sm,
  },
  mediaGenerating: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  mediaGeneratingText: {
    color: colors.textMuted,
    fontSize: 13.5,
  },
});
