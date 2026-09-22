"use client";

import { useRef, useState } from "react";

export function AiComposer({
  onSend,
  disabled,
  placeholder = "Ask Verxa AI…",
  extraButton,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  extraButton?: React.ReactNode;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
    onSend(text);
  }

  return (
    <div
      className="shrink-0 px-3 pt-2"
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom),10px)",
        background: "#0a0b0f",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div
        className="flex items-end gap-2 rounded-3xl p-2"
        style={{ background: "#191b23" }}
      >
        {extraButton}
        <textarea
          ref={ref}
          value={value}
          rows={1}
          enterKeyHint="send"
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[140px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] leading-6 outline-none placeholder:text-white/35"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] disabled:opacity-30"
          style={{ background: "linear-gradient(135deg,#8ea4ff,#5b7cff)" }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
