"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface KeyboardShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    keys: ["/", "Ctrl+K"],
    description: "Focus search",
  },
  {
    keys: ["Esc"],
    description: "Close flight details",
  },
  {
    keys: ["["],
    description: "Previous flight",
  },
  {
    keys: ["]"],
    description: "Next flight",
  },
  {
    keys: ["b"],
    description: "Toggle sidebar",
  },
  {
    keys: ["?"],
    description: "Show keyboard shortcuts",
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-gray-700 bg-gray-800 px-1.5 font-mono text-xs font-medium text-gray-300 shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutHelp({
  open,
  onOpenChange,
}: KeyboardShortcutHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 text-gray-100 border border-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Navigate the flight tracker using your keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between rounded-lg bg-gray-900/50 px-3 py-2"
            >
              <span className="text-sm text-gray-300">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, i) => (
                  <span key={key} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="text-xs text-gray-500">or</span>
                    )}
                    <KeyBadge>{key}</KeyBadge>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500">
          Press <KeyBadge>?</KeyBadge> to toggle this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
