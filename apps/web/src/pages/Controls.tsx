import { useState } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { trpc } from "../api/trpc";
import { Card, Badge, HEALTH_TONE } from "../components/ui";

const HEALTH_ORDER = ["untested", "healthy", "failing", "overdue"];
const STATUS_ORDER = ["not_implemented", "planned", "partial", "implemented"];

export default function Controls() {
  const utils = trpc.useUtils();
  const controls = trpc.control.list.useQuery();
  const updateHealth = trpc.control.updateHealth.useMutation();
  const updateStatus = trpc.control.updateStatus.useMutation();
  const createControl = trpc.control.create.useMutation();
  const [name, setName] = useState("");

  const cycleHealth = (id: string, current: string) => {
    const next = HEALTH_ORDER[(HEALTH_ORDER.indexOf(current) + 1) % HEALTH_ORDER.length];
    updateHealth
      .mutateAsync({ id, health: next as never })
      .then((res) => {
        utils.control.list.invalidate();
        utils.risk.list.invalidate();
        utils.risk.heatmap.invalidate();
        utils.dashboard.summary.invalidate();
        toast.success(`Health → ${next}${res.affectedRisks ? ` · re-scored ${res.affectedRisks} risk(s)` : ""}`, {
          icon: "🔄",
        });
      })
      .catch((e) => toast.error(e.message));
  };

  const cycleStatus = (id: string, current: string) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length];
    updateStatus
      .mutateAsync({ id, status: next as never })
      .then((res) => {
        utils.control.list.invalidate();
        utils.risk.list.invalidate();
        utils.risk.heatmap.invalidate();
        utils.dashboard.summary.invalidate();
        toast.success(`Status → ${next}${res.affectedRisks ? ` · re-scored ${res.affectedRisks} risk(s)` : ""}`, {
          icon: "🔧",
        });
      })
      .catch((e) => toast.error(e.message));
  };

  const create = () => {
    if (!name.trim()) return toast.error("Give the control a name");
    createControl
      .mutateAsync({
        name: name.trim(),
        frequency: "monthly",
        status: "not_implemented",
        health: "untested",
        automationType: "manual",
      })
      .then(() => {
        utils.control.list.invalidate();
        utils.dashboard.summary.invalidate();
        setName("");
        toast.success("Control created");
      })
      .catch((e) => toast.error(e.message));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Controls Library</h1>
          <p className="text-sm text-slate-500">Click a health or status pill to cycle it — linked risk scores update live.</p>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex gap-3">
          <input
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
            placeholder="New control name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button
            onClick={create}
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            + Add
          </button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {(controls.data ?? []).map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 capitalize">Frequency · {c.frequency}</p>
                </div>
                <div className="flex items-center gap-1" title={c.automationType}>
                  <Badge tone={c.automationType === "automated" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}>
                    {c.automationType === "automated" ? "⚙ auto" : "✎ manual"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase text-slate-400 mb-1">Health · click to cycle</p>
                  <button
                    onClick={() => cycleHealth(c.id, c.health)}
                    className="group"
                    title="Click to change"
                  >
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-transform ${HEALTH_TONE[c.health] ?? ""} group-hover:scale-105`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {c.health}
                    </span>
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-slate-400 mb-1">Status · click to cycle</p>
                  <button onClick={() => cycleStatus(c.id, c.status)} className="group" title="Click to change">
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-slate-200 group-hover:scale-105 transition-transform">
                      {c.status.replace("_", " ")}
                    </span>
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}