"use client";

import { useState } from "react";
import { ArrowLeft, Phone, PhoneCall, PhoneOff } from "lucide-react";
import { useRouter } from "next/navigation";

import MainLayout from "@/components/layout/MainLayout";

interface TelephonyResponse {
  success: boolean;
  conversationId?: string;
  callSid?: string;
  message?: string;
  error?: string;
}

export default function TelephoniePage() {
  const router = useRouter();

  const [number, setNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCall() {
    const toNumber = number.trim();

    if (!toNumber) {
      return;
    }

    setCalling(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/telephony", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toNumber,
        }),
      });

      const data =
        (await response.json()) as TelephonyResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ?? "Impossible de lancer l'appel Clara.",
        );
      }

      setStatus(
        data.message ?? "Clara est en train de lancer l'appel.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de lancer l'appel Clara.",
      );
    } finally {
      setCalling(false);
    }
  }

  return (
    <MainLayout>
      <div className="w-full px-8 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Retour
          </button>

          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-400">
              Connecter
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Téléphonie
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
              La ligne téléphonique de Clara, directement depuis Clara OS.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1522] p-6">
              <span className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <Phone
                    size={19}
                    strokeWidth={1.7}
                    className="text-cyan-300"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white/90">
                    Clara Office
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]" />
                    <span className="text-xs text-white/40">
                      Ligne disponible
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Numéro à appeler
                </label>

                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={number}
                    onChange={(event) => {
                      setNumber(event.target.value);
                      setStatus(null);
                      setError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !calling) {
                        void startCall();
                      }
                    }}
                    placeholder="+33 6 00 00 00 00"
                    className="
                      min-w-0
                      flex-1
                      rounded-xl
                      border
                      border-white/10
                      bg-white/[0.04]
                      px-4
                      py-3
                      text-sm
                      text-white
                      outline-none
                      placeholder:text-white/20
                      focus:border-cyan-400/30
                    "
                  />

                  <button
                    type="button"
                    onClick={() => void startCall()}
                    disabled={calling || !number.trim()}
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-cyan-400/20
                      bg-cyan-400/10
                      px-5
                      text-sm
                      font-medium
                      text-cyan-200
                      transition
                      hover:bg-cyan-400/15
                      hover:text-cyan-100
                      disabled:cursor-not-allowed
                      disabled:opacity-30
                    "
                  >
                    {calling ? (
                      <>
                        <PhoneCall size={16} />
                        Appel…
                      </>
                    ) : (
                      <>
                        <Phone size={16} />
                        Appeler
                      </>
                    )}
                  </button>
                </div>
              </div>

              {(status || error) && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  {error ? (
                    <PhoneOff
                      size={15}
                      className="text-white/40"
                    />
                  ) : (
                    <PhoneCall
                      size={15}
                      className="text-cyan-300"
                    />
                  )}

                  <p className="text-xs text-white/55">
                    {error ?? status}
                  </p>
                </div>
              )}
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1522] p-6">
              <span className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />

              <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                Appels récents
              </p>

              <div className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
                <p className="text-sm text-white/35">
                  Aucun appel enregistré pour l'instant.
                </p>

                <p className="mt-2 text-xs text-white/20">
                  L'historique sera raccordé à la mémoire téléphonique.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
