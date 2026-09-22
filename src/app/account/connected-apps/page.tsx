"use client";

import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card } from "@/components/ui/primitives";
import { useWorkspace } from "@/providers/workspace-provider";

export default function ConnectedAppsPage() {
  const { apps, updateApps } = useWorkspace();

  return (
    <AccountChrome
      title="Connected apps"
      description="Tools Verxa can use on your behalf. Connections stay off until you invite them."
    >
      <div className="flex justify-end">
        <Button variant="subtle">Connect new app</Button>
      </div>
      {apps.map((app) => (
        <Card key={app.id} className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[16px]">{app.name}</p>
            <p className="mt-1 text-[13.5px] text-muted">{app.description}</p>
            <p className="mt-3 text-[12px] text-faint">
              Permissions: {app.permissions.join(" · ")}
            </p>
          </div>
          <Button
            variant={app.connected ? "ghost" : "subtle"}
            onClick={() =>
              updateApps(
                apps.map((a) =>
                  a.id === app.id ? { ...a, connected: !a.connected } : a,
                ),
              )
            }
          >
            {app.connected ? "Disconnect" : "Connect"}
          </Button>
        </Card>
      ))}
    </AccountChrome>
  );
}
