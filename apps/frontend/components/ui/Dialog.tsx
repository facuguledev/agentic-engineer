// a11y-critical interactive component — Radix headless primitive per STACK
// rule ("mandatory for all a11y-critical interactive components (dialog,
// dropdown, tooltip, combobox); no custom a11y implementation from
// scratch"). Styling only, zero-radius, no box-shadow (ADR-0001).
"use client";

import * as RadixDialog from "@radix-ui/react-dialog";

export function Dialog({
  trigger,
  title,
  children,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 border border-black bg-white p-8 focus:outline-none">
          <RadixDialog.Title className="text-h2 font-grotesk mb-6">{title}</RadixDialog.Title>
          {children}
          <RadixDialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 text-label uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Close
            </button>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
