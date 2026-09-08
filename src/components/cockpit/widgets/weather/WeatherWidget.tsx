"use client";

import { useEffect, useState } from "react";
import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

interface WeatherResponse {
  success: boolean;
  location?: string;
  country?: string;
  temperatureC?: number;
  condition?: string;
  icon?: string;
  message?: string;
}

export default function WeatherWidget() {
  const t = useTranslations("cockpitUi");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        const response = await fetch(
          "/api/weather?location=Angers",
          {
            cache: "no-store",
          },
        );

        const data: WeatherResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ?? t("weatherUnavailable"),
          );
        }

        if (!cancelled) {
          setWeather(data);
        }
      } catch {
        if (!cancelled) {
          setWeather(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GlassPanel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            {t("weather")}
          </p>

          <p className="mt-1 text-sm text-white/75">
            {t("today")}
          </p>
        </div>

        {weather?.icon && (
          <img
            src={`https:${weather.icon}`}
            alt={weather.condition ?? t("weatherConditions")}
            width={40}
            height={40}
          />
        )}
      </div>

      {loading && (
        <div className="py-6 text-sm text-white/45">
          {t("weatherLoading")}
        </div>
      )}

      {!loading && !weather && (
        <div className="py-6 text-sm text-white/45">
          {t("weatherTemporarilyUnavailable")}
        </div>
      )}

      {!loading && weather && (
        <div className="mt-5">
          <div className="flex items-end gap-3">
            <span className="text-4xl font-light tracking-tight text-white">
              {Math.round(weather.temperatureC ?? 0)}°
            </span>

            <div className="pb-1">
              <p className="text-sm text-white/75">
                {weather.location}
              </p>

              <p className="mt-0.5 text-xs text-white/40">
                {weather.condition}
              </p>
            </div>
          </div>

          <p className="mt-5 text-[10px] text-white/25">
            {t("weatherData")}
          </p>
        </div>
      )}
    </GlassPanel>
  );
}
