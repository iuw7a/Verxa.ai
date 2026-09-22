"""Verxa browser-use runner (runs inside the E2B sandbox).

Reads one JSON task from stdin, drives it with the open-source `browser-use`
Agent, and streams JSONL progress to stdout — one `VERXA_JSON:` line per
agent step (real URL/title/action/screenshot) plus a final done/error line.
All other stdout noise from the library is ignored by the server parser.
"""

import asyncio
import base64
import json
import sys


def emit(obj):
    sys.stdout.write("VERXA_JSON:" + json.dumps(obj)[:800000] + "\n")
    sys.stdout.flush()


def norm_screenshot(raw):
    try:
        if raw is None:
            return None
        if isinstance(raw, bytes):
            b64 = base64.b64encode(raw).decode("ascii")
            return "data:image/png;base64," + b64[:600000]
        if isinstance(raw, str):
            if raw.startswith("data:"):
                return raw[:700000]
            if len(raw) > 1000:
                return "data:image/png;base64," + raw[:600000]
            return None
        if isinstance(raw, dict):
            for k in ("screenshot", "image", "data", "base64"):
                if raw.get(k):
                    return norm_screenshot(raw[k])
            return None
        return None
    except Exception:
        return None


async def step_hook(agent):
    try:
        url, title = None, None
        try:
            summary = await agent.browser_session.get_browser_state_summary()
            url = getattr(summary, "url", None)
            title = getattr(summary, "title", None)
        except Exception:
            pass
        action_name, detail = "step", None
        try:
            actions = agent.history.model_actions()
            if actions:
                last = actions[-1]
                s = json.dumps(last, default=str)[:300]
                action_name = s
                detail = s
        except Exception:
            pass
        shot = None
        try:
            from browser_use.browser.events import ScreenshotEvent

            evt = agent.browser_session.event_bus.dispatch(
                ScreenshotEvent(full_page=False)
            )
            await evt
            res = await evt.event_result(raise_if_any=False, raise_if_none=False)
            shot = norm_screenshot(res)
        except Exception:
            shot = None
        emit(
            {
                "kind": "step",
                "url": url,
                "title": title,
                "action": action_name,
                "detail": detail,
                "screenshot": shot,
            }
        )
    except Exception:
        pass


async def amain(payload):
    from browser_use import Agent, Browser, ChatOpenAI

    task = str(payload.get("task", ""))[:1000]
    start_url = str(payload.get("start_url", ""))[:500]
    llm_cfg = payload.get("llm") or {}
    max_steps = int(payload.get("max_steps") or 8)
    max_steps = max(2, min(12, max_steps))

    goal = task
    if start_url and start_url not in task:
        goal = f"{task} (Start at {start_url}.)"

    llm = ChatOpenAI(
        model=str(llm_cfg.get("model") or "gpt-4o-mini"),
        api_key=str(llm_cfg.get("api_key") or ""),
        base_url=str(llm_cfg.get("base_url") or "https://api.openai.com/v1"),
    )
    try:
        browser = Browser(headless=True)
    except Exception:
        browser = Browser()
    agent = Agent(task=goal, llm=llm, browser=browser, use_vision=False)
    history = await agent.run(on_step_end=step_hook, max_steps=max_steps)
    answer = None
    try:
        answer = history.final_result()
    except Exception:
        pass
    if not answer:
        try:
            urls = history.urls()
            answer = f"Visited {urls[-1] if urls else start_url}."
        except Exception:
            answer = "The browser session ended."
    last_url = start_url
    try:
        urls = history.urls()
        if urls:
            last_url = urls[-1]
    except Exception:
        pass
    emit({"kind": "done", "answer": str(answer)[:4000], "url": last_url})


def main():
    try:
        raw = sys.stdin.read() or "{}"
        payload = json.loads(raw)
        asyncio.run(amain(payload))
    except Exception as e:
        try:
            emit({"kind": "error", "message": str(e)[:300] or "failed"})
        except Exception:
            pass


main()
