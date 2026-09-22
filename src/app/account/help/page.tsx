"use client";

import { useState } from "react";
import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card, Field, Input, Textarea } from "@/components/ui/primitives";

const shortcuts = [
  ["⌘ K", "Search chats"],
  ["⌘ ⇧ O", "New chat"],
  ["Enter", "Send message"],
  ["Shift + Enter", "New line"],
  ["Esc", "Stop generating"],
];

export default function HelpPage() {
  const [feedback, setFeedback] = useState({ email: "", message: "" });
  const [problem, setProblem] = useState("");
  const [sent, setSent] = useState<string | null>(null);

  return (
    <AccountChrome
      title="Help & feedback"
      description="A short list of answers, a quiet way to tell us what is off, and the keys that matter."
    >
      <Card className="space-y-2">
        <p className="text-[15px]">Help center</p>
        {[
          ["Getting started", "Open a new chat and type. No account required."],
          ["Memory", "Add facts in Account → Memory. Toggle any item off without deleting it."],
          ["Privacy", "Guest chats stay in this browser until you sign in."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-[12px] border border-line px-4 py-3">
            <p className="text-[14px]">{title}</p>
            <p className="mt-1 text-[13px] text-muted">{copy}</p>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <p className="text-[15px]">Send feedback</p>
        <Field label="Email">
          <Input
            type="email"
            value={feedback.email}
            onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
          />
        </Field>
        <Field label="What should we know?">
          <Textarea
            value={feedback.message}
            onChange={(e) =>
              setFeedback({ ...feedback, message: e.target.value })
            }
          />
        </Field>
        <Button
          onClick={() => {
            setSent("feedback");
            setFeedback({ email: "", message: "" });
          }}
        >
          Send feedback
        </Button>
      </Card>

      <Card className="space-y-3">
        <p className="text-[15px]">Report a problem</p>
        <Textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="What happened, and what did you expect?"
        />
        <Button
          variant="subtle"
          onClick={() => {
            setSent("problem");
            setProblem("");
          }}
        >
          Submit report
        </Button>
        {sent ? (
          <p className="text-[13px] text-ok">
            Received. Thank you — this stays on-device until a backend inbox is wired.
          </p>
        ) : null}
      </Card>

      <Card>
        <p className="mb-4 text-[15px]">Keyboard shortcuts</p>
        <div className="space-y-2">
          {shortcuts.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between text-[13.5px]">
              <span className="text-muted">{label}</span>
              <kbd className="rounded-md border border-line px-2 py-1 text-[12px] text-ink">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </Card>
    </AccountChrome>
  );
}
