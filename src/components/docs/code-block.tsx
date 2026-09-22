"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="group relative overflow-hidden rounded-[14px] border border-line bg-[#0a0a0e]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="text-[11.5px] font-medium tracking-wide text-faint">
          {label ?? "code"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11.5px] text-faint transition hover:bg-white/[0.05] hover:text-ink"
        >
          {copied ? (
            <>
              <Check size={12} className="text-ok" /> Copied
            </>
          ) : (
            <>
              <Copy size={12} /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 text-[12.5px] leading-6">
        <code className="font-mono text-[#d6dcff]">{code}</code>
      </pre>
    </div>
  );
}
