import sys
import json
import base64
from playwright.sync_api import sync_playwright


def launch_args():
    # Container-hardened flags (same set browser-use itself applies):
    # --no-sandbox (non-root user), --disable-dev-shm-usage (/dev/shm too
    # small in sandboxes -> "Target crashed"), --disable-gpu (headless).
    return ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]


def main():
    raw = sys.stdin.read() or "{}"
    payload = json.loads(raw)
    actions = payload.get("actions", [])
    start_url = payload.get("start_url", "about:blank")
    out = {"steps": [], "error": None}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=launch_args())
            page = browser.new_page()
            page.goto(start_url, wait_until="domcontentloaded", timeout=25000)
            for a in actions:
                t = a.get("type")
                try:
                    if t == "goto":
                        page.goto(a["url"], wait_until="domcontentloaded", timeout=25000)
                    elif t == "click":
                        page.click(a["selector"], timeout=8000)
                    elif t == "type":
                        page.fill(a["selector"], a.get("text", ""), timeout=8000)
                    else:
                        page.wait_for_timeout(500)
                    out["steps"].append({"action": t, "ok": True})
                except Exception as e:
                    out["steps"].append({"action": t, "ok": False})
            out["final_url"] = page.url
            out["final_title"] = page.title()[:200]
            body = page.inner_text("body") or ""
            words = body.split()
            out["text"] = " ".join(words)[:8000]
            shot = page.screenshot(type="png")
            out["screenshot"] = "data:image/png;base64," + base64.b64encode(shot).decode("ascii")[:600000]
            browser.close()
    except Exception as e:
        out["error"] = str(e)[:300] or "failed"
    print(json.dumps(out))


main()
