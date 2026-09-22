import "react-native-gesture-handler";
import React from "react";
import { DarkTheme, ThemeProvider } from "expo-router";
import { Drawer as NavDrawer, type DrawerContentComponentProps } from "expo-router/drawer";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AppProvider, useApp } from "@/providers/app-provider";
import { DrawerContent } from "@/components/drawer-content";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.sidebar,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function Shell() {
  const { authLoading } = useApp();
  React.useEffect(() => {
    if (!authLoading) SplashScreen.hideAsync().catch(() => null);
  }, [authLoading]);
  if (authLoading) return null;
  return (
    <>
      <StatusBar style="light" />
      <NavDrawer
        screenOptions={{
          headerShown: false,
          drawerType: "slide",
          drawerStyle: { backgroundColor: colors.sidebar, width: 292 },
          overlayColor: "rgba(0,0,0,0.55)",
          swipeEnabled: true,
          swipeEdgeWidth: 60,
        }}
        drawerContent={(props: DrawerContentComponentProps) => <DrawerContent {...props} />}
      >
        <NavDrawer.Screen name="index" options={{ title: "Home" }} />
        <NavDrawer.Screen name="chat" options={{ title: "Chat" }} />
        <NavDrawer.Screen name="search" options={{ title: "Search" }} />
        <NavDrawer.Screen name="library" options={{ title: "Library" }} />
        <NavDrawer.Screen name="projects" options={{ title: "Projects" }} />
        <NavDrawer.Screen name="plugins" options={{ title: "Plugins" }} />
        <NavDrawer.Screen name="plans" options={{ title: "Plans" }} />
        <NavDrawer.Screen name="codex" options={{ title: "Codex" }} />
        <NavDrawer.Screen name="learn" options={{ title: "Learn" }} />
        <NavDrawer.Screen name="auth" options={{ title: "Sign in" }} />
        <NavDrawer.Screen name="settings" options={{ title: "Settings" }} />
        <NavDrawer.Screen name="account" options={{ title: "Account" }} />
      </NavDrawer>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider value={navTheme}>
        <Shell />
      </ThemeProvider>
    </AppProvider>
  );
}
