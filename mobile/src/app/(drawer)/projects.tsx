import React from "react";
import { Screen, Title, Subtitle, EmptyState } from "@/components/ui";
import { FolderKanban } from "lucide-react-native";
import { colors, spacing } from "@/lib/theme";

export default function ProjectsScreen() {
  return (
    <Screen>
      <Title>Projects</Title>
      <Subtitle style={{ marginTop: 4, marginBottom: spacing.lg }}>
        Group chats and files around a goal.
      </Subtitle>
      <EmptyState
        icon={<FolderKanban size={30} color={colors.textFaint} />}
        title="Projects are on the way"
        text="Verxa Projects launch with shared context across chats. The mobile shell is ready and will activate together with the web release."
      />
    </Screen>
  );
}
