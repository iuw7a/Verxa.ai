import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Screen, Title, Subtitle, EmptyState, PrimaryButton } from "@/components/ui";
import { colors, radii, spacing } from "@/lib/theme";
import { useApp } from "@/providers/app-provider";
import { fetchLibrary, deleteLibraryItem, mediaUrl, type LibraryItem } from "@/lib/api";
import { Play, Trash2, Share2, X } from "lucide-react-native";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";

export default function LibraryScreen() {
  const { session } = useApp();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<LibraryItem | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchLibrary());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function share(item: LibraryItem) {
    const url = mediaUrl(item.url);
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url, { dialogTitle: item.prompt || "Verxa media" });
      }
    } catch {
      Alert.alert("Share", url);
    }
  }

  function confirmDelete(item: LibraryItem) {
    Alert.alert("Delete item?", "This removes it from your library.", [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Delete",
        onPress: () => {
          void deleteLibraryItem(item.id).then(() => setItems((prev) => prev.filter((x) => x.id !== item.id)));
        },
      },
    ]);
  }

  const cols = 2;
  const gap = spacing.sm;
  const tile = (Dimensions.get("window").width - spacing.lg * 2 - gap * (cols - 1)) / cols;

  return (
    <Screen>
      <Title>Library</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Images and videos you saved from Verxa.
      </Subtitle>

      {!session ? (
        <EmptyState title="Sign in to view your library" text="Everything you save in chat appears here — on every device." />
      ) : loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <EmptyState title="Could not load" text={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Nothing saved yet" text="Generate an image or video in chat, then save it to find it here." />
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.id} style={[styles.tile, { width: tile }]}>
              {item.kind === "image" ? (
                <Image
                  source={{ uri: mediaUrl(item.url) }}
                  style={styles.tileMedia}
                  resizeMode="cover"
                />
              ) : (
                <TouchableOpacity
                  style={[styles.tileMedia, styles.tileVideo]}
                  activeOpacity={0.8}
                  onPress={() => setPlaying(item)}
                >
                  <Play size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              <View style={styles.tileBar}>
                <Text style={styles.tilePrompt} numberOfLines={1}>
                  {item.prompt || item.mode}
                </Text>
                <View style={styles.tileActions}>
                  <TouchableOpacity onPress={() => void share(item)} hitSlop={8}>
                    <Share2 size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={8}>
                    <Trash2 size={14} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {playing ? (
        <VideoModal item={playing} onClose={() => setPlaying(null)} />
      ) : null}
    </Screen>
  );
}

function VideoModal({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const player = useVideoPlayer(mediaUrl(item.url), (p) => {
    p.loop = true;
    void p.play();
  });

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {item.prompt || "Generated video"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <VideoView
            player={player}
            style={styles.modalVideo}
            contentFit="contain"
          />
          <View style={styles.modalActions}>
            <PrimaryButton
              label="Share"
              onPress={() => {
                void (async () => {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(mediaUrl(item.url), { dialogTitle: item.prompt || "Verxa video" });
                  }
                })();
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  tileMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tileVideo: {
    alignItems: "center",
    justifyContent: "center",
  },
  tileBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    gap: 6,
  },
  tilePrompt: {
    color: colors.textMuted,
    fontSize: 11.5,
    flex: 1,
  },
  tileActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 14.5,
    fontWeight: "600",
    flex: 1,
  },
  modalVideo: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    backgroundColor: "#000",
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
