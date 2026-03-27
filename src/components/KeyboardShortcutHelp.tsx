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

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["/", "Cmd+K"], description: "Focus search bar" },
      { keys: ["Esc"], description: "Deselect flight / close panels" },
      { keys: ["["], description: "Previous flight" },
      { keys: ["]"], description: "Next flight" },
      { keys: ["B"], description: "Toggle sidebar" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Tools",
    shortcuts: [
      { keys: ["M"], description: "Toggle measure tool" },
      { keys: ["W"], description: "Toggle weather layer" },
      { keys: ["R"], description: "Toggle route lines" },
      { keys: ["D"], description: "Toggle route density" },
      { keys: ["T"], description: "Toggle terrain" },
    ],
  },
  {
    title: "View Modes",
    shortcuts: [
      { keys: ["1"], description: "Normal view" },
      { keys: ["2"], description: "Heatmap view" },
      { keys: ["3"], description: "Trails view" },
      { keys: ["4"], description: "Globe view" },
      { keys: ["5"], description: "Airport view" },
      { keys: ["6"], description: "FIDS view" },
      { keys: ["7"], description: "Fleet tracker" },
      { keys: ["8"], description: "Aircraft profile" },
      { keys: ["9"], description: "Stats dashboard" },
    ],
  },
  {
    title: "Map Controls",
    shortcuts: [
      { keys: ["+"], description: "Zoom in" },
      { keys: ["-"], description: "Zoom out" },
    ],
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
      <DialogContent className="bg-gray-950 text-gray-100 border border-gray-800 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Navigate the flight tracker using your keyboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-1">
                {group.title}
              </h3>
              <div className="grid gap-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg bg-gray-900/50 px-3 py-2"
                  >
                    <span className="text-sm text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
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
