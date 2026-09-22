"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AgentStatusKind,
  AgentToolEvent,
} from "@/lib/browser-agent/events";
import { statusForEvent } from "@/lib/browser-agent/events";
import { runBrowserTask } from "@/lib/browser-use-service";

export type BrowserAgentState = {
  active: boolean;
  goal: string;
  startUrl: string;
  status: AgentStatusKind;
  events: AgentToolEvent[];
  answer: string | null;
  finalUrl: string | null;
  screenshot: string | null;
  pageTitle: string | null;
  loading: boolean;
  error: string | null;
  paused: boolean;
  userControl: boolean;
  history: string[];
  historyIndex: number;
};

const INITIAL: BrowserAgentState = {
  active: false,
  goal: "",
  startUrl: "",
  status: "idle",
  events: [],
  answer: null,
  finalUrl: null,
  screenshot: null,
  pageTitle: null,
  loading: false,
  error: null,
  paused: false,
  userControl: false,
  history: [],
  historyIndex: -1,
};

/**
 * Owns the live run: starts the SSE task via the Browser Use service,
 * folds real tool events into status/screenshot/URL state. Pause stops
 * event application (server keeps at most the in-flight step); Stop aborts.
 */
export function useBrowserAgent() {
  const [state, setState] = useState<BrowserAgentState>(INITIAL);
  const stopRef = useRef<{ stop: () => void } | null>(null);
  const pausedRef = useRef(false);
  const queuedRef = useRef<AgentToolEvent[]>([]);

  const applyEvent = useCallback((e: AgentToolEvent) => {
    if (pausedRef.current) {
      queuedRef.current.push(e);
      return;
    }
    setState((s) => ({
      ...s,
      events: [...s.events, e].slice(-120),
      status: e.type === "browser.error" ? "error" : statusForEvent(e.type),
      finalUrl: e.url ?? s.finalUrl,
      pageTitle: e.title ?? s.pageTitle,
      screenshot: e.screenshot ?? s.screenshot,
      loading:
        e.type === "browser.navigating" ||
        e.type === "browser.started" ||
        e.type === "agent.thinking",
    }));
  }, []);

  const start = useCallback(
    (goal: string, startUrl: string) => {
      stopRef.current?.stop();
      pausedRef.current = false;
      queuedRef.current = [];
      setState({
        ...INITIAL,
        active: true,
        goal,
        startUrl,
        finalUrl: startUrl,
        status: "thinking",
        loading: true,
      });
      stopRef.current = runBrowserTask(goal, startUrl, {
        onEvent: applyEvent,
        onDone: ({ answer, url }) =>
          setState((s) => ({
            ...s,
            answer,
            finalUrl: url,
            status: "completed",
            loading: false,
            history: [...s.history, url].slice(-30),
            historyIndex: s.history.length,
          })),
        onError: (message) =>
          setState((s) =>
            s.status === "completed"
              ? s
              : { ...s, error: message, status: "error", loading: false },
          ),
      });
    },
    [applyEvent],
  );

  const stop = useCallback(() => {
    stopRef.current?.stop();
    stopRef.current = null;
    pausedRef.current = false;
    setState((s) => ({ ...s, status: "stopped", loading: false, paused: false }));
  }, []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState((s) => ({ ...s, paused: true, status: "paused" }));
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    const queued = queuedRef.current;
    queuedRef.current = [];
    setState((s) => ({ ...s, paused: false }));
    for (const e of queued) applyEvent(e);
  }, [applyEvent]);

  const retry = useCallback(() => {
    setState((s) => {
      if (!s.goal || !s.startUrl) return s;
      queueMicrotask(() => start(s.goal, s.startUrl));
      return { ...s, error: null, events: [], answer: null, status: "thinking", loading: true };
    });
  }, [start]);

  const takeControl = useCallback(() => {
    pausedRef.current = true;
    setState((s) => ({ ...s, userControl: true, paused: true, status: "paused" }));
  }, []);

  const giveBack = useCallback(() => {
    pausedRef.current = false;
    const queued = queuedRef.current;
    queuedRef.current = [];
    setState((s) => ({ ...s, userControl: false, paused: false }));
    for (const e of queued) applyEvent(e);
  }, [applyEvent]);

  const go = useCallback(
    (dir: -1 | 1) => {
      setState((s) => {
        const idx = s.historyIndex + dir;
        const url = s.history[idx];
        if (!url) return s;
        // History walk re-opens the real page in a fresh run step.
        queueMicrotask(() => start(`Continue from the previous page: ${s.goal}`, url));
        return { ...s, historyIndex: idx };
      });
    },
    [start],
  );

  const close = useCallback(() => {
    stopRef.current?.stop();
    stopRef.current = null;
    pausedRef.current = false;
    setState(INITIAL);
  }, []);

  return { state, start, stop, pause, resume, retry, takeControl, giveBack, go, close };
}

export type BrowserAgentApi = ReturnType<typeof useBrowserAgent>;
