"use client";

import { useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  /** Current selected flight ICAO hex (optional) */
  selectedFlightIcao?: string | null;
}

export default function ShareButton({ selectedFlightIcao }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Build the shareable URL from current browser state
    const url = new URL(window.location.href);

    // Preserve existing search params and add/update the flight param
    if (selectedFlightIcao) {
      url.searchParams.set("flight", selectedFlightIcao);
    }

    const shareUrl = url.toString();

    // Try native share API first (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "AeroIntel — Shared View",
          text: selectedFlightIcao
            ? `Check out this flight on AeroIntel`
            : "Check out this view on AeroIntel",
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or API unavailable — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort fallback
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedFlightIcao]);

  return (
    <button
      onClick={handleShare}
      aria-label={copied ? "Link copied" : "Share current view"}
      title={copied ? "Copied!" : "Share view"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 32,
        padding: copied ? "0 12px" : "0 8px",
        borderRadius: 8,
        border: `1px solid ${copied ? "rgba(226,232,240,0.3)" : "rgba(255,255,255,0.08)"}`,
        background: copied
          ? "rgba(226,232,240,0.12)"
          : "rgba(10,12,16,0.8)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: "pointer",
        color: copied ? "var(--accent-primary)" : "var(--text-tertiary)",
        transition: "all 0.2s ease",
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "system-ui, -apple-system, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {copied ? (
        <>
          <Check size={14} />
          <span>Copied!</span>
        </>
      ) : (
        <Share2 size={15} />
      )}
    </button>
  );
}
