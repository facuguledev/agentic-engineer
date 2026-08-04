// a11y-critical interactive component — Radix headless primitive (STACK
// rule). Used for TaskStatus and UserRole selection so keyboard/aria
// behavior isn't hand-rolled.
"use client";

import * as RadixDropdown from "@radix-ui/react-dropdown-menu";

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>
        <button
          aria-label={label}
          className="border border-black bg-white px-4 py-2 text-label uppercase tracking-[0.08em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {value}
        </button>
      </RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          sideOffset={4}
          className="border border-black bg-white min-w-[10rem]"
        >
          {options.map((option) => (
            <RadixDropdown.Item
              key={option}
              onSelect={() => onChange(option)}
              className="px-4 py-2 text-label uppercase tracking-[0.08em] cursor-pointer outline-none focus:bg-black focus:text-white data-[disabled]:opacity-40"
            >
              {option}
            </RadixDropdown.Item>
          ))}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}
