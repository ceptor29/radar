import { useMemo } from "react";
import { motion } from "motion/react";
import { computeScore, type ControlEffectInput } from "@shared/scoring";
import { BandBadge } from "./ui";

export default function ScorePreview({
  likelihood,
  impact,
  onLikelihood,
  onImpact,
  controls = [],
}: {
  likelihood: number;
  impact: number;
  onLikelihood?: (v: number) => void;
  onImpact?: (v: number) => void;
  controls?: ControlEffectInput[];
}) {
  const score = useMemo(() => computeScore(likelihood, impact, controls), [likelihood, impact, controls]);

  const slider = (label: string, value: number, onChange?: (v: number) => void) => (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );

  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
      {slider("Likelihood", likelihood, onLikelihood)}
      <div className="h-2" />
      {slider("Impact", impact, onImpact)}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-2">
          <p className="text-[10px] uppercase text-slate-400">Inherent</p>
          <p className="text-lg font-bold text-slate-800">{score.inherent.raw}</p>
          <div className="mt-1 flex justify-center">
            <BandBadge band={score.inherent.band} />
          </div>
        </div>
        <div className="rounded-lg bg-white ring-1 ring-slate-200 p-2">
          <p className="text-[10px] uppercase text-slate-400">Controls</p>
          <p className="text-lg font-bold text-slate-800">{Math.round(score.controlFactor * 100)}%</p>
          <p className="text-[10px] text-slate-400">effectiveness</p>
        </div>
        <motion.div
          key={score.residual.raw + score.residual.band}
          initial={{ scale: 0.9, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-lg bg-indigo-600 text-white p-2 shadow"
        >
          <p className="text-[10px] uppercase text-indigo-200">Residual</p>
          <p className="text-lg font-bold">{score.residual.raw}</p>
          <div className="mt-1 flex justify-center">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20">{score.residual.band}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}