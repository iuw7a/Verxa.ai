"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MonitorSmartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { PermissionDialog } from "@/components/computer-use/permission-dialog";
import { PairingPanel } from "@/components/computer-use/pairing-panel";
import { GoalComposer } from "@/components/computer-use/composer";
import {
  RUN_STATUS_META,
  StatusPill,
} from "@/components/computer-use/session-console";
import {
  SessionWorkspace,
  ViewScreenModal,
} from "@/components/computer-use/workspace";
import { ConsentPanel, DevicesPanel } from "@/components/computer-use/devices-panel";
import {
  controlRun,
  createRun,
  decideConfirmation,
  getConsent,
  getDevices,
  getRun,
  isTerminal,
  listRuns,
  revokeAllDevices,
  revokeDevice,
  saveConsent,
  timeAgo,
  type CuConfirmation,
  type CuConsent,
  type CuDevice,
  type CuEvent,
  type CuRun,
  type CuRunStatus,
} from "@/lib/computer-use-web";

const CONSENT_ON: Partial<CuConsent> & { enabled: boolean } = {
  enabled: true,
  safe_mode: true,
  screen_access: true,
  mouse_control: true,
  keyboard_control: true,
  app_control: true,
};

/**
 * Computer Use console — the website is the primary Computer Use interface.
 * Every state here is derived from the server: the consent record and the
 * device sessions are the only sources of truth. Nothing is simulated.
 *
 * Embedded directly in the landing page and in /chat — there is no separate
 * /computer-use route, so the user never leaves the page to use it.
 */
export function ComputerUseConsole({ compact = false }: { compact?: boolean }) {
  const { user, loading: authLoading, setAuthOpen } = useAuth();

  const [consent, setConsent] = useState<CuConsent | null>(null);
  const [consentLoading, setConsentLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CuDevice[]>([]);
  const [runs, setRuns] = useState<CuRun[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<CuRun | null>(null);
  const [events, setEvents] = useState<CuEvent[]>([]);
  const [confirmation, setConfirmation] = useState<CuConfirmation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDismissed, setDialogDismissed] = useState(false);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewRunId, setViewRunId] = useState<string | null>(null);

  const loadConsent = useCallback(async () => {
    const res = await getConsent();
    if (res.ok) {
      setConsent(res.data.consent);
      setLoadError(null);
    } else {
      setLoadError(res.error);
    }
    setConsentLoading(false);
  }, []);

  const loadDevices = useCallback(async () => {
    const res = await getDevices();
    if (res.ok) setDevices(res.data.devices);
  }, []);

  const loadRuns = useCallback(async () => {
    const res = await listRuns();
    if (res.ok) setRuns(res.data.runs);
  }, []);

  // Initial load — only for signed-in users.
  useEffect(() => {
    if (authLoading || !user) {
      setConsentLoading(false);
      return;
    }
    setConsentLoading(true);
    void loadConsent();
    void loadDevices();
    void loadRuns();
  }, [authLoading, user, loadConsent, loadDevices, loadRuns]);

  // Device sessions: real authorization status, refreshed continuously.
  useEffect(() => {
    if (!user || !consent?.enabled) return;
    const t = setInterval(() => {
      if (!document.hidden) void loadDevices();
    }, 5000);
    return () => clearInterval(t);
  }, [user, consent?.enabled, loadDevices]);

  // Run list refresh (paused while a live session is on screen).
  useEffect(() => {
    if (!user || !consent?.enabled) return;
    const t = setInterval(() => {
      if (!document.hidden && !(activeRun && !isTerminal(activeRun.status))) {
        void loadRuns();
      }
    }, 8000);
    return () => clearInterval(t);
  }, [user, consent?.enabled, activeRun, loadRuns]);

  // Active session: fast polling for the live timeline + confirmations.
  useEffect(() => {
    if (!activeId) return;
    let dead = false;
    const tick = async () => {
      if (document.hidden) return;
      const res = await getRun(activeId);
      if (dead || !res.ok) return;
      setActiveRun(res.data.run);
      setEvents(res.data.events);
      setConfirmation(res.data.confirmation);
    };
    void tick();
    const t = setInterval(tick, 2000);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [activeId]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const activeDevices = useMemo(
    () => devices.filter((d) => d.status === "active"),
    [devices],
  );
  const connected = activeDevices.length > 0;
  const liveRun = Boolean(activeRun && !isTerminal(activeRun.status));
  const deviceName = useMemo(() => {
    if (!activeRun?.device_id) return activeDevices[0]?.device_name ?? null;
    const d = devices.find((x) => x.device_id === activeRun.device_id);
    return d?.device_name ?? "your computer";
  }, [activeRun, devices, activeDevices]);

  const state:
    | "signin"
    | "loading"
    | "error"
    | "permission"
    | "revoked"
    | "disconnected"
    | "reconnecting"
    | "ready"
    | "active" = !authLoading && !user
    ? "signin"
    : consentLoading
      ? "loading"
      : loadError
        ? "error"
        : !consent?.enabled
          ? (consent as CuConsent | null)?.granted_at
            ? "revoked"
            : "permission"
          : !connected
            ? devices.some((d) => d.status !== "active")
              ? "reconnecting"
              : "disconnected"
            : liveRun
              ? "active"
              : "ready";

  // First-run onboarding: open the dialog automatically while permission is
  // missing — but respect an explicit "Not Now" for this page visit.
  useEffect(() => {
    if (state === "permission" && !dialogDismissed) setDialogOpen(true);
  }, [state, dialogDismissed]);

  const allowComputerUse = useCallback(async () => {
    setDialogBusy(true);
    setDialogError(null);
    const res = await saveConsent(CONSENT_ON);
    setDialogBusy(false);
    if (!res.ok) {
      setDialogError(res.error);
      return;
    }
    setConsent(res.data.consent);
    setDialogOpen(false);
    setNotice("Computer Use is enabled for your account.");
    void loadDevices();
    void loadRuns();
  }, [loadDevices, loadRuns]);

  const dismissDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogDismissed(true);
  }, []);

  const startSession = useCallback(
    async (goal: string) => {
      setBusy("start");
      const res = await createRun(goal);
      setBusy(null);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setActiveId(res.data.run.id);
      setActiveRun(res.data.run);
      setEvents([]);
      setConfirmation(null);
      void loadRuns();
    },
    [loadRuns],
  );

  const handleControl = useCallback(
    async (action: "stop" | "pause" | "resume" | "capture" | "screen") => {
      if (!activeId) return;
      // "screen" is a view-only action: open the live screen modal instead
      // of hitting the run-control endpoint (which has no such action).
      if (action === "screen") {
        setViewRunId(activeId);
        return;
      }
      setBusy("control");
      const res = await controlRun(activeId, action);
      setBusy(null);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      const detail = await getRun(activeId);
      if (detail.ok) {
        setActiveRun(detail.data.run);
        setEvents(detail.data.events);
        setConfirmation(detail.data.confirmation);
      }
      void loadRuns();
    },
    [activeId, loadRuns],
  );

  const handleDecide = useCallback(
    async (allow: boolean) => {
      if (!activeId || !confirmation) return;
      setBusy("decide");
      const res = await decideConfirmation(activeId, confirmation.id, allow);
      setBusy(null);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      const detail = await getRun(activeId);
      if (detail.ok) {
        setActiveRun(detail.data.run);
        setEvents(detail.data.events);
        setConfirmation(detail.data.confirmation);
      }
    },
    [activeId, confirmation],
  );

  const toggleConsent = useCallback(
    async (patch: Partial<CuConsent>) => {
      if (!consent) return;
      setBusy("consent");
      const res = await saveConsent({
        enabled: consent.enabled,
        safe_mode: consent.safe_mode,
        screen_access: consent.screen_access,
        mouse_control: consent.mouse_control,
        keyboard_control: consent.keyboard_control,
        app_control: consent.app_control,
        allowed_displays: consent.allowed_displays,
        ...patch,
      });
      setBusy(null);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setConsent(res.data.consent);
    },
    [consent],
  );

  const disableComputerUse = useCallback(async () => {
    if (!consent) return;
    setBusy("consent");
    const res = await saveConsent({ ...CONSENT_ON, ...consent, enabled: false });
    setBusy(null);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setConsent(res.data.consent);
    setDialogDismissed(false);
    setNotice("Computer Use is off. New sessions are blocked.");
  }, [consent]);

  const revokeOne = useCallback(
    async (deviceId: string) => {
      setBusy(deviceId);
      const res = await revokeDevice(deviceId);
      setBusy(null);
      if (!res.ok) {
        setNotice(res.error);
        return;
      }
      setNotice("Device revoked. It can no longer run sessions.");
      void loadDevices();
    },
    [loadDevices],
  );

  const revokeAll = useCallback(async () => {
    setBusy("all");
    const res = await revokeAllDevices();
    setBusy(null);
    if (!res.ok) {
      setNotice(res.error);
      return;
    }
    setNotice("All computers were revoked.");
    void loadDevices();
  }, [loadDevices]);

  return (
    <ConsoleView
      compact={compact}
      state={state}
      consent={consent}
      devices={devices}
      runs={runs}
      activeRun={activeRun}
      events={events}
      confirmation={confirmation}
      deviceName={deviceName}
      activeDevices={activeDevices}
      busy={busy}
      notice={notice}
      dialogOpen={dialogOpen}
      dialogBusy={dialogBusy}
      dialogError={dialogError}
      onSignIn={() => setAuthOpen(true)}
      onRetry={() => {
        setLoadError(null);
        setConsentLoading(true);
        void loadConsent();
      }}
      onOpenDialog={() => setDialogOpen(true)}
      onAllow={allowComputerUse}
      onNotNow={dismissDialog}
      onStart={startSession}
      onControl={handleControl}
      onDecide={handleDecide}
      onToggleConsent={toggleConsent}
      onDisable={disableComputerUse}
      onRevoke={revokeOne}
      onRevokeAll={revokeAll}
      onViewScreen={(runId) => setViewRunId(runId)}
      onSelectRun={(id) => {
        setActiveId(id);
        setActiveRun(null);
        setEvents([]);
        setConfirmation(null);
      }}
      onClearRun={() => {
        setActiveId(null);
        setActiveRun(null);
        setEvents([]);
        setConfirmation(null);
        void loadRuns();
      }}
      onViewRunClose={() => setViewRunId(null)}
      viewRunId={viewRunId}
    />
  );
}


type ConsoleState =
  | "signin"
  | "loading"
  | "error"
  | "permission"
  | "revoked"
  | "reconnecting"
  | "disconnected"
  | "ready"
  | "active";

function ConsoleView({
  state,
  compact = false,
  consent,
  devices,
  runs,
  activeRun,
  events,
  confirmation,
  deviceName,
  activeDevices,
  busy,
  notice,
  dialogOpen,
  dialogBusy,
  dialogError,
  onSignIn,
  onRetry,
  onOpenDialog,
  onAllow,
  onNotNow,
  onStart,
  onControl,
  onDecide,
  onToggleConsent,
  onDisable,
  onRevoke,
  onRevokeAll,
  onSelectRun,
  onClearRun,
  onViewScreen,
  viewRunId,
  onViewRunClose,
}: {
  state: ConsoleState;
  compact?: boolean;
  consent: CuConsent | null;
  devices: CuDevice[];
  runs: CuRun[];
  activeRun: CuRun | null;
  events: CuEvent[];
  confirmation: CuConfirmation | null;
  deviceName: string | null;
  activeDevices: CuDevice[];
  busy: string | null;
  notice: string | null;
  dialogOpen: boolean;
  dialogBusy: boolean;
  dialogError: string | null;
  onSignIn: () => void;
  onRetry: () => void;
  onOpenDialog: () => void;
  onAllow: () => void;
  onNotNow: () => void;
  onStart: (goal: string) => void;
  onControl: (
    action: "stop" | "pause" | "resume" | "capture" | "screen",
  ) => void;
  onDecide: (allow: boolean) => void;
  onToggleConsent: (patch: Partial<CuConsent>) => void;
  onDisable: () => void;
  onRevoke: (deviceId: string) => void;
  onRevokeAll: () => void;
  onSelectRun: (id: string) => void;
  onClearRun: () => void;
  onViewScreen: (runId: string) => void;
  viewRunId: string | null;
  onViewRunClose: () => void;
}) {
  const recent = runs.filter((r) => r.id !== activeRun?.id).slice(0, 6);
  const viewingTerminal = Boolean(activeRun && isTerminal(activeRun.status));
  const headerStatus:
    | "permission"
    | "revoked"
    | "disconnected"
    | "reconnecting"
    | "connected"
    | CuRunStatus
    | null =
    state === "permission" || state === "revoked"
      ? state
      : state === "disconnected"
        ? "disconnected"
        : state === "reconnecting"
          ? "reconnecting"
          : activeRun
            ? activeRun.status
            : state === "ready"
              ? "connected"
              : null;

  return (
    <div className={compact ? "w-full p-4 sm:p-6" : "mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8"}>
      {!compact ? (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-faint uppercase">
            Computer Use
          </p>
          <h1 className="mt-1.5 text-[26px] font-medium tracking-[-0.02em] text-ink">
            Web-Sitzung, auf Abruf.
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-muted">
            Verxa arbeitet in einer Web-Sitzung direkt hier — nur wenn du eine
            Session startest, keine Installation, keine Desktop-App. Du kannst
            jederzeit stoppen.
          </p>
        </div>
        {headerStatus ? <StatusPill status={headerStatus} /> : null}
      </div>
      ) : (
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium tracking-[0.16em] text-faint uppercase">
            Computer Use
          </p>
          <p className="mt-1 text-[16px] font-medium text-ink">
            Web-Sitzung, auf Abruf.
          </p>
        </div>
        {headerStatus ? <StatusPill status={headerStatus} /> : null}
      </div>
      )}

      {notice ? (
        <p className="mt-4 rounded-[12px] border border-line bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-ink/85">
          {notice}
        </p>
      ) : null}

      <ViewScreenModal runId={viewRunId} onClose={onViewRunClose} />

      <div className="mt-6 space-y-4">
        {state === "signin" ? (
          <div className="rounded-[18px] border border-line bg-card p-6">
            <p className="text-[15px] font-medium text-ink">
              Sign in to use Computer Use
            </p>
            <p className="mt-1.5 max-w-[520px] text-[13.5px] leading-relaxed text-muted">
              Computer Use is tied to your Verxa account: your permission and
              your authorized computers follow you to every device you sign in
              on.
            </p>
            <Button className="mt-4" onClick={onSignIn}>
              Sign in
            </Button>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="space-y-3">
            <div className="h-[120px] animate-pulse rounded-[18px] bg-white/[0.03]" />
            <div className="h-[160px] animate-pulse rounded-[18px] bg-white/[0.02]" />
          </div>
        ) : null}

        {state === "error" ? (
          <div className="rounded-[18px] border border-line bg-card p-6">
            <p className="text-[15px] font-medium text-ink">
              Computer Use could not be loaded
            </p>
            <p className="mt-1.5 text-[13.5px] text-muted">
              The server did not answer. Try again in a moment.
            </p>
            <Button className="mt-4" variant="outline" onClick={onRetry}>
              <RefreshCw size={14} /> Retry
            </Button>
          </div>
        ) : null}



        {(state === "permission" || state === "revoked") ? (
          <div className="rounded-[18px] border border-line bg-card p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-line bg-white/[0.03] text-[#8ea4ff]">
              <MonitorSmartphone size={20} />
            </span>
            <p className="mt-4 text-[15px] font-medium text-ink">
              {state === "revoked" ? "Permission revoked" : "Computer Use is off"}
            </p>
            <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-muted">
              {state === "revoked"
                ? "Computer Use access was revoked for your account. Verxa cannot act until you allow it again."
                : "Allow Verxa to interact with your computer when you ask it to — mouse, keyboard, applications and windows. You stay in control: sessions are always visible here and stop instantly."}
            </p>
            <Button className="mt-4" onClick={onOpenDialog}>
              Allow Computer Use
            </Button>
          </div>
        ) : null}

        {(state === "disconnected" || state === "reconnecting") ? (
          <>
            <PairingPanel
              watching
              reconnect={state === "reconnecting"}
            />
            {consent ? (
              <ConsentPanel
                consent={consent}
                onToggle={onToggleConsent}
                onDisable={onDisable}
                busy={busy === "consent"}
              />
            ) : null}
            <DevicesPanel
              devices={devices}
              onRevoke={onRevoke}
              onRevokeAll={onRevokeAll}
              busyId={busy}
            />
          </>
        ) : null}

        {state === "ready" ? (
          <>
            <GoalComposer
              disabled={false}
              busy={busy === "start"}
              onStart={onStart}
            />
            <p className="px-1 text-[12.5px] text-faint">
              Connected to{" "}
              {activeDevices
                .map((d) => d.device_name ?? "Verxa connector")
                .join(", ")}
              .
            </p>
          </>
        ) : null}

        {activeRun ? (
          <>
            <SessionWorkspace
              run={activeRun}
              events={events}
              confirmation={confirmation}
              deviceName={deviceName}
              // "screen" is handled by ComputerBar's dedicated onViewScreen
              // button — onControl only ever carries stop/pause/resume.
              onControl={onControl}
              onDecide={onDecide}
              onViewScreen={() => onViewScreen(activeRun.id)}
              busyAction={busy === "control" || busy === "decide"}
            />
            {viewingTerminal ? (
              <Button variant="outline" onClick={onClearRun}>
                Start a new session
              </Button>
            ) : null}
          </>
        ) : null}

        {recent.length && (state === "ready" || state === "active") ? (
          <div className="rounded-[18px] border border-line bg-card p-5">
            <p className="text-[15px] font-medium text-ink">Recent sessions</p>
            <div className="mt-3 space-y-1">
              {recent.map((r) => {
                const meta = RUN_STATUS_META[r.status];
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelectRun(r.id)}
                    className="flex w-full items-center gap-3 rounded-[10px] px-2 py-2.5 text-left transition hover:bg-white/[0.03]"
                  >
                    <span
                      className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink/90">
                      {r.goal}
                    </span>
                    <span className="shrink-0 text-[12px] text-faint">
                      {timeAgo(r.created_at)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {(state === "ready" || state === "active") && consent ? (
          <DevicesPanel
            devices={devices}
            onRevoke={onRevoke}
            onRevokeAll={onRevokeAll}
            busyId={busy}
          />
        ) : null}
        {(state === "ready" || state === "active") && consent ? (
          <ConsentPanel
            consent={consent}
            onToggle={onToggleConsent}
            onDisable={onDisable}
            busy={busy === "consent"}
          />
        ) : null}
      </div>

      <PermissionDialog
        open={dialogOpen}
        busy={dialogBusy}
        error={dialogError}
        onAllow={onAllow}
        onNotNow={onNotNow}
      />
    </div>
  );
}
