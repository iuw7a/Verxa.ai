import { readFileSync } from "fs";
const raw = readFileSync("C:\\verxa.de\\.env.local", "utf8");
for (const line of raw.split(/\r?\n/)) {
  const t = line.trim().replace(/^\uFEFF/, "");
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) {
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    if (k && !(k in process.env)) process.env[k] = v;
  }
}
const { Sandbox } = await import("e2b");
const s = await Sandbox.create({ timeoutMs: 900000, metadata: { app: "verxa-diag" } });
console.log("SANDBOX_OK");
const show = async (label, cmd, ms = 120000) => {
  try {
    const r = await s.commands.run(cmd, { requestTimeoutMs: ms });
    console.log(`--- ${label} exit=${r.exitCode}`);
    console.log("OUT:" + String(r.stdout || "").slice(-600));
    console.log("ERR:" + String(r.stderr || "").slice(-1500));
  } catch (e) {
    console.log(`--- ${label} THREW: ` + String((e && e.message) || e).slice(0, 200));
    console.log("OUT:" + String((e && e.stdout) || "").slice(-600));
    console.log("ERR:" + String((e && e.stderr) || "").slice(-1500));
  }
};
await show("prep", "pip install --quiet playwright 2>&1 | tail -1; sudo -n python3 -m playwright install-deps chromium 2>&1 | tail -1; python3 -m playwright install chromium 2>&1 | tail -1", 500000);
await show("debug-launch", "DEBUG=pw:browser timeout 60 python3 -c \"from playwright.sync_api import sync_playwright\nwith sync_playwright() as p:\n    b=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])\n    pg=b.new_page()\n    print('PAGE_OK')\n    b.close()\" 2>&1 | grep -v 'dbus\\|DBus\\|bluez\\|Floss' | head -c 2500", 90000);
await s.kill();
console.log("DIAG_DONE");
