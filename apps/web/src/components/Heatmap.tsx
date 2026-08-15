import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BandBadge } from "./ui";

export interface HeatmapPoint {
  riskId: string;
  title: string;
  likelihood: number;
  impact: number;
  inherent: { raw: number; band: string };
  residual: { raw: number; band: string };
}

const CELL_COLORS: Record<string, string> = {
  low: "bg-emerald-200",
  moderate: "bg-amber-200",
  high: "bg-orange-300",
  critical: "bg-red-400",
};

function LegendDot({ band }: { band: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`w-3 h-3 rounded ${CELL_COLORS[band] ?? "bg-slate-200"}`} />
      {band}
    </span>
  );
}

export default function Heatmap({
  points,
  onSelect,
  className = "",
}: {
  points: HeatmapPoint[];
  onSelect?: (riskId: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"inherent" | "residual">("residual");
  const [hover, setHover] = useState<HeatmapPoint | null>(null);

  const key = (l: number, i: number) => `${l}x${i}`;
  const lookup = new Map(points.map((p) => [key(p.likelihood, p.impact), p]));
  const current = hover ? (mode === "inherent" ? hover.inherent : hover.residual) : null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
          {(["inherent", "residual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 transition-colors capitalize ${
                mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {(["critical", "high", "moderate", "low"] as const).map((b) => (
            <LegendDot key={b} band={b} />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-1">
          {[5, 4, 3, 2, 1].map((l) => (
            <div key={l} className="text-[10px] text-slate-400 flex items-center justify-center h-8 w-5">
              {l}
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid gap-1.5">
            {[5, 4, 3, 2, 1].map((l) => (
              <div key={l} className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => {
                  const p = lookup.get(key(l, i));
                  const info = p ? (mode === "inherent" ? p.inherent : p.residual) : null;
                  return (
                    <button
                      key={`${l}-${i}`}
                      onClick={() => p && onSelect?.(p.riskId)}
                      onMouseEnter={() => p && setHover(p)}
                      onMouseLeave={() => setHover(null)}
                      className={`relative aspect-square rounded-lg transition-all duration-150 flex items-center justify-center ${
                        p ? `${CELL_COLORS[info!.band] ?? "bg-slate-200"} hover:ring-2 hover:ring-slate-500 hover:scale-105 cursor-pointer` : "bg-slate-50 ring-1 ring-slate-100"
                      }`}
                    >
                      {p && (
                        <span className="text-[11px] font-semibold text-slate-800/70">{info!.raw}</span>
                      )}
                      {hover?.riskId === p?.riskId && (
                        <motion.span
                          layoutId="heat-ring"
                          className="absolute inset-0 rounded-lg ring-2 ring-slate-900/60 pointer-events-none"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex mt-2">
        <div className="w-7" />
        <div className="flex-1 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="text-center text-[10px] text-slate-400">
              impact {i}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-2 text-[10px] text-slate-400">likelihood ↑</div>

      <AnimatePresence>
        {hover && current && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 rounded-lg bg-slate-900 text-slate-100 px-3 py-2 text-xs"
          >
            <span className="font-medium truncate">{hover.title}</span>
            <span className="text-slate-500">L{hover.likelihood}×I{hover.impact} →</span>
            <span className="font-bold">{current.raw}</span>
            <BandBadge band={current.band} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}