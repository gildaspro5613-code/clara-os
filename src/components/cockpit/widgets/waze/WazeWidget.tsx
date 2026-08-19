"use client";

import { useState } from "react";
import { Navigation } from "lucide-react";

import GlassPanel from "@/components/ui/GlassPanel";

interface WazeResponse {
  success: boolean;
  destination?: string;
  url?: string;
  message?: string;
}

export default function WazeWidget() {
  const [destination, setDestination] = useState("");
  const [wazeUrl, setWazeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function prepareNavigation() {
    const value = destination.trim();

    if (!value) {
      return;
    }

    setLoading(true);
    setError(false);
    setWazeUrl(null);

    try {
      const response = await fetch(
        `/api/waze?destination=${encodeURIComponent(value)}`,
        {
          cache: "no-store",
        },
      );

      const data: WazeResponse = await response.json();

      if (!response.ok || !data.success || !data.url) {
        throw new Error(
          data.message ?? "Navigation indisponible",
        );
      }

      setWazeUrl(data.url);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassPanel>
      <div className="flex items-center gap-3">
        <Navigation
          size={17}
          strokeWidth={1.7}
          className="text-white/55"
        />

        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            Navigation
          </p>

          <p className="mt-1 text-sm text-white/75">
            Où souhaitez-vous aller ?
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <input
          type="text"
          value={destination}
          onChange={(event) => {
            setDestination(event.target.value);
            setWazeUrl(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              void prepareNavigation();
            }
          }}
          placeholder="Destination..."
          className="
            min-w-0
            flex-1
            rounded-xl
            border
            border-white/10
            bg-white/[0.04]
            px-3
            py-2.5
            text-sm
            text-white
            outline-none
            placeholder:text-white/25
            focus:border-white/20
          "
        />

        <button
          type="button"
          onClick={() => void prepareNavigation()}
          disabled={loading || !destination.trim()}
          className="
            rounded-xl
            border
            border-white/10
            bg-white/[0.04]
            px-4
            text-sm
            text-white/70
            transition
            hover:border-white/20
            hover:bg-white/[0.08]
            hover:text-white
            disabled:cursor-not-allowed
            disabled:opacity-30
          "
        >
          {loading ? "..." : "Go"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-white/40">
          Navigation momentanément indisponible.
        </p>
      )}

      {wazeUrl && (
        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            mt-4
            flex
            items-center
            justify-center
            rounded-xl
            border
            border-white/10
            bg-white/[0.04]
            px-4
            py-2.5
            text-xs
            text-white/65
            transition
            hover:border-white/20
            hover:bg-white/[0.08]
            hover:text-white
          "
        >
          Ouvrir dans Waze →
        </a>
      )}
    </GlassPanel>
  );
}
