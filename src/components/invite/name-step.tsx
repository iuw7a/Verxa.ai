"use client";

import { useState } from "react";

export function NameStep({
  initial,
  onSubmit,
}: {
  initial: string;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const valid = value.trim().length >= 2;

  return (
    <form
      className="w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(value.trim().slice(0, 40));
      }}
    >
      <label
        htmlFor="invite-name"
        className="block text-center text-[26px] font-medium tracking-tight text-white sm:text-[32px]"
      >
        What should we call you?
      </label>
      <p className="mt-2 text-center text-[14px] text-white/50">
        Verxa will use your name to personalize your workspace.
      </p>
      <input
        id="invite-name"
        type="text"
        autoComplete="given-name"
        autoFocus
        maxLength={40}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ahmed"
        aria-required="true"
        className="mx-auto mt-7 block w-full max-w-[340px] rounded-2xl border border-white/12 bg-white/[0.03] px-5 py-3.5 text-center text-[18px] text-white outline-none transition placeholder:text-white/25 focus:border-emerald-200/40 focus:bg-white/[0.05]"
      />
      <button
        type="submit"
        disabled={!valid}
        className="mx-auto mt-5 block rounded-full bg-white px-8 py-2.5 text-[14px] font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Continue
      </button>
    </form>
  );
}
