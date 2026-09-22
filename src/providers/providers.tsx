"use client";

import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { WorkspaceProvider } from "@/providers/workspace-provider";
import { AuthModal } from "@/components/auth/auth-modal";
import { NotificationToasts } from "@/components/notifications/notification-toasts";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          {children}
          <AuthModal />
          <NotificationToasts />
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
