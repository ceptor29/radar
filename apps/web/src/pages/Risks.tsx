import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import toast from "react-hot-toast";
import { trpc } from "../api/trpc";
import ScorePreview from "../components/ScorePreview";
import RiskDrawer from "../components/RiskDrawer";
import { Card, BandBadge, BAND_TONE } from "../components/ui";
import type { riskCategorySchema } from "@shared/schemas";
import type { z } from "zod";

type Category = z.infer<typeof riskCategorySchema>;

const CATEGORIES: Category[] = ["operational", "cyber", "financial", "regulatory", "strategic", "third_party"];

export default function Risks() {
  const utils = trpc.useUtils();
  const risks = trpc.risk.list.useQuery();
  const [selected, setSelected] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const create = trpc.risk.create.useMutation({
    onSuccess: (res) => {
      toast.success("Risk created and scored");
      utils.risk.list.invalidate();
      utils.risk.heatmap.invalidate();
      utils.dashboard.summary.invalidate();
      setForm({ title: "", category: "cyber" });
      setShowForm(false);
      setSelected(res.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<{ title: string; category: Category }>({ title: "", category: "cyber" });
  const [draftL, setDraftL] = useState(3);
  const [draftI, setDraftI] = useState(3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Risk Register</h1>
          <p className="text-sm text-slate-500">Live scores, control effects, audit-ready history.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
        >
          {showForm ? "Close" : "+ New risk"}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-5">
              <h2 className="font-semibold text-slate-900 mb-3">New Risk — live preview</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">Title</label>
                    <input
                      className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="e.g. Ransomware attack on production"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Category</label>
                    <select
                      className="w-full mt-1 border border-slate-300 rounded-lg px-3 py-2"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!form.title) return toast.error("Give the risk a title first");
                        create.mutate({ ...form, likelihood: draftL, impact: draftI });
                      }}
                      disabled={create.isPending}
                      className="flex-1 bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                    >
                      {create.isPending ? "Scoring…" : "Create & open"}
                    </button>
                  </div>
                </div>
                <ScorePreview likelihood={draftL} impact={draftI} onLikelihood={setDraftL} onImpact={setDraftI} />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 bg-slate-50">
              <th className="px-5 py-3">Risk</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">L × I</th>
              <th className="px-5 py-3">Inherent</th>
              <th className="px-5 py-3">Residual</th>
              <th className="px-5 py-3">Treatment</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(risks.data ?? []).map((r, i) => (
              <motion.tr
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(r.id)}
                className="border-t border-slate-100 hover:bg-indigo-50/40 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3 font-medium text-slate-900">{r.title}</td>
                <td className="px-5 py-3 text-slate-500 capitalize">{r.category.replace("_", " ")}</td>
                <td className="px-5 py-3 text-slate-400">
                  {r.likelihood} × {r.impact}
                </td>
                <td className="px-5 py-3">
                  <span className={`font-bold ${BAND_TONE[r.inherent.band]}`}>{r.inherent.raw}</span>{" "}
                  <BandBadge band={r.inherent.band} />
                </td>
                <td className="px-5 py-3">
                  <span className={`font-bold text-base ${BAND_TONE[r.residual.band]}`}>{r.residual.raw}</span>{" "}
                  <BandBadge band={r.residual.band} />
                </td>
                <td className="px-5 py-3 text-slate-500 capitalize">{r.treatment ?? "—"}</td>
                <td className="px-5 py-3 text-slate-300">›</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Card>

      <AnimatePresence>
        {selected && (
          <RiskDrawer riskId={selected} onClose={() => setSelected(null)} onMutated={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}