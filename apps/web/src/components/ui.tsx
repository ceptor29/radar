import { useEffect, useState, type ReactNode } from "react";

export const BAND_TONE: Record<string, string> = {
  low: "text-emerald-600",
  moderate: "text-amber-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

export const BAND_BG: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  moderate: "bg-amber-100 text-amber-700 ring-amber-200",
  high: "bg-orange-100 text-orange-700 ring-orange-200",
  critical: "bg-red-100 text-red-700 ring-red-200",
};

export const HEALTH_TONE: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  failing: "bg-red-100 text-red-700 ring-red-200",
  untested: "bg-slate-100 text-slate-600 ring-slate-200",
  overdue: "bg-amber-100 text-amber-700 ring-amber-200",
};

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "bg-slate-100 text-slate-600", className = "" }: {
  children: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`}>
      {children}
    </span>
  );
}

export function BandBadge({ band }: { band: string }) {
  return <Badge tone={BAND_BG[band] ?? BAND_BG.moderate}>{band}</Badge>;
}

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}