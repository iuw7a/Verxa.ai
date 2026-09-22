"use client";

import { AccountChrome } from "@/components/account/account-chrome";
import { Button, Card } from "@/components/ui/primitives";

const plans = [
  {
    name: "Free",
    price: "$0",
    current: true,
    note: "Core chat, local history, guest mode.",
  },
  {
    name: "Plus",
    price: "$20",
    current: false,
    note: "Higher limits, longer memory, priority models.",
  },
  {
    name: "Pro",
    price: "$100",
    current: false,
    note: "Team seats, code room, plugin runtime.",
  },
];

export default function SubscriptionPage() {
  return (
    <AccountChrome
      title="Subscription"
      description="You are on the Free plan. Usage is measured locally until billing is connected."
    >
      <Card>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[13px] text-muted">Current plan</p>
            <p className="mt-1 text-[28px] font-light tracking-[-0.04em]">Free</p>
          </div>
          <p className="text-[13px] text-faint">Resets monthly</p>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-[13px] text-muted">
            <span>Messages</span>
            <span>12 / 150</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[8%] rounded-full bg-accent" />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <p className="text-[13px] text-muted">{plan.name}</p>
            <p className="mt-2 text-[26px] font-light tracking-[-0.04em]">
              {plan.price}
              <span className="text-[13px] text-faint"> / mo</span>
            </p>
            <p className="mt-3 flex-1 text-[13px] leading-6 text-muted">
              {plan.note}
            </p>
            <Button className="mt-5" variant={plan.current ? "subtle" : "primary"}>
              {plan.current ? "Current plan" : "Upgrade"}
            </Button>
          </Card>
        ))}
      </div>

      <Card>
        <p className="mb-3 text-[15px]">Payment method</p>
        <p className="text-[13.5px] text-muted">
          No card on file. Add one when you upgrade.
        </p>
        <Button className="mt-4" variant="subtle">
          Add payment method
        </Button>
      </Card>

      <Card>
        <p className="mb-3 text-[15px]">Billing history</p>
        <p className="text-[13.5px] text-faint">No invoices yet.</p>
      </Card>
    </AccountChrome>
  );
}
