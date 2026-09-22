import React from "react";
import { View } from "react-native";
import { ChatView } from "@/components/chat/chat-view";
import { colors } from "@/lib/theme";

export default function ChatScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ChatView />
    </View>
  );
}
