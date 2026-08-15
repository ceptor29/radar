import { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { trpc } from "../api/trpc";
import { BandBadge, BAND_BG, BAND_TONE } from "./ui";
import ScorePreview from "./ScorePreview";
import type { ControlEffectInput } from "@shared/scoring";

export default function RiskDrawer({
  riskId,
  onClose,
  onMutated,
}: {
  riskId: string;
  onClose: () => void;
  onMutated: () => void;
}) {
  const utils = trpc.useUtils();
  const detail = trpc.risk.detail.useQuery({ id: riskId });
  const controls = trpc.control.list.useQuery();
  const updateRisk = trpc.risk.update.useMutation();
  const recalcRisk = trpc.risk.recalc.useMutation();
  const linkRisk = trpc.control.linkRisk.useMutation();
  const unlinkRisk = trpc.control.unlinkRisk.useMutation();

  const [saving, setSaving] = useState(false);
  const [linkControlId, setLinkControlId] = useState("");
  const [linkWeight, setLinkWeight] = useState(1);

  const d = detail.data;
  const risk = d?.risk;

  const [draft, setDraft] = useState<{
    title: string;
    likelihood: number;
    impact: number;
    treatment: string;
    targetResidual: number | null;
    budget: number | null;
  } | null>(null);

  if (!d || !risk) return null;
  const draftv = draft ?? {
    title: risk.title,
    likelihood: risk.likelihood,
    impact: risk.impact,
    treatment: risk.treatment ?? "",
    targetResidual: risk.targetResidual,
    budget: risk.budget,
  };

  const controlsInput: ControlEffectInput[] = d.controls.map((c) => ({
    status: c.status as ControlEffectInput["status"],
    testHealth: c.health as ControlEffectInput["testHealth"],
    weight: c.weight,
  }));

  const refresh = () => {
    detail.refetch();
    utils.risk.list.invalidate();
    utils.risk.heatmap.invalidate();
    utils.dashboard.summary.invalidate();
    onMutated();
  };

  const save = () => {
    setSaving(true);
    updateRisk
      .mutateAsync({
        id: riskId,
        data: {
          title: draftv.title,
          likelihood: draftv.likelihood,
          impact: draftv.impact,
          treatment: draftv.treatment.length ? (draftv.treatment as never) : undefined,
          targetResidual: draftv.targetResidual ?? undefined,
          budget: draftv.budget ?? undefined,
        },
      })
      .then(() => {
        setDraft(null);
        setSaving(false);
        refresh();
        toast.success("Risk updated and re-scored");
      })
      .catch((e) => {
        setSaving(false);
        toast.error(e.message);
      });
  };

  const unlink = (controlId: string) => {
    unlinkRisk
      .mutateAsync({ controlId, riskId })
      .then(() => {
        refresh();
        toast.success("Control unlinked — residual re-scored");
      })
      .catch((e) => toast.error(e.message));
  };

  const link = () => {
    if (!linkControlId) return;
    linkRisk
      .mutateAsync({ controlId: linkControlId, riskId, weight: linkWeight })
      .then(() => {
        setLinkControlId("");
        setLinkWeight(1);
        refresh();
        toast.success("Control linked — residual re-scored");
      })
      .catch((e) => toast.error(e.message));
  };

  const recalc = () => {
    recalcRisk
      .mutateAsync({ id: riskId })
      .then(() => {
        refresh();
        toast.success("Score recomputed");
      })
      .catch((e) => toast.error(e.message));
  };

  const linkedIds = new Set(d.controls.map((c) => c.id));
  const availableControls = (controls.data ?? []).filter((c) => !linkedIds.has(c.id));

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-40 flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase ${BAND_TONE[risk.residual.band]}`}>{risk.residual.band}</span>
          <span className="text-2xl font-bold text-slate-900">{risk.residual.raw}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        <div>
          <label className="text-xs text-slate-500">Title</label>
          <input
            className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 font-medium"
            value={draftv.title}
            onChange={(e) => setDraft({ ...draftv, title: e.target.value })}
          />
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-slate-500">Category</span>
            <span className="text-slate-700 capitalize">{risk.category.replace("_", " ")}</span>
            <span className="ml-auto text-slate-400">owned by</span>
            <select className="border border-slate-300 rounded px-2 py-1 text-xs">
              {d.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ScorePreview
          likelihood={draftv.likelihood}
          impact={draftv.impact}
          onLikelihood={(v) => setDraft({ ...draftv, likelihood: v })}
          onImpact={(v) => setDraft({ ...draftv, impact: v })}
          controls={controlsInput}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500">Treatment</label>
            <select
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={draftv.treatment}
              onChange={(e) => setDraft({ ...draftv, treatment: e.target.value })}
            >
              <option value="">—</option>
              {["accept", "mitigate", "transfer", "avoid"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Target residual</label>
            <input
              type="number"
              min={1}
              max={25}
              className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={draftv.targetResidual ?? ""}
              onChange={(e) => setDraft({ ...draftv, targetResidual: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={recalc}
            className="px-4 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
          >
            Recalc
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Linked controls ({d.controls.length})</h3>
          <div className="space-y-2">
            {d.controls.map((c) => {
              const eff = (
                (c.status === "implemented" ? 1 : c.status === "partial" ? 0.6 : c.status === "planned" ? 0.2 : 0) *
                (c.health === "healthy" || c.health === "na" ? 1 : c.health === "untested" ? 0.6 : 0.4)
              ).toFixed(2);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg ring-1 ring-slate-200 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 truncate">{c.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span className="capitalize">{c.status}</span> · <span>{c.health}</span> · weight {c.weight}
                    </div>
                  </div>
                  <div className="w-16">
                    <div className="h-1.5 bg-slate-100 rounded overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Number(eff) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right mt-0.5">{eff}</p>
                  </div>
                  <button onClick={() => unlink(c.id)} className="text-slate-300 hover:text-red-500 text-sm">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <select
              className="flex-1 border border-slate-300 rounded-lg px-2 py-2 text-xs"
              value={linkControlId}
              onChange={(e) => setLinkControlId(e.target.value)}
            >
              <option value="">Add a control…</option>
              {availableControls.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              min="0"
              className="w-16 border border-slate-300 rounded-lg px-2 py-2 text-xs"
              value={linkWeight}
              onChange={(e) => setLinkWeight(Number(e.target.value))}
              title="weight"
            />
            <button
              onClick={link}
              disabled={!linkControlId}
              className="px-3 rounded-lg bg-slate-900 text-white text-xs disabled:opacity-40"
            >
              Link
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Score history</h3>
          <div className="space-y-1">
            {d.scoreHistory.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 rounded ${BAND_BG[s.band] ?? ""}`}>{s.raw}</span>
                <span className="text-slate-400 capitalize">{s.scoreType}</span>
                <span className="text-slate-400 ml-auto">{new Date(s.computedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Activity</h3>
          <div className="space-y-1.5">
            {(d.activities as Array<{ id: string; action: string; summary: string; created_at: string }>).map((a) => (
              <div key={a.id} className="text-xs text-slate-600">
                <span className="text-slate-400">{new Date(a.created_at).toLocaleString()}</span> — {a.summary}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}