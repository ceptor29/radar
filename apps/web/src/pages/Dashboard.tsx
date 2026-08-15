import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { trpc } from "../api/trpc";
import Heatmap from "../components/Heatmap";
import RiskDrawer from "../components/RiskDrawer";
import { Card, BandBadge, useCountUp } from "../components/ui";

const HEALTH_COLORS: Record<string, string> = {
  healthy: "#10b981",
  failing: "#ef4444",
  untested: "#94a3b8",
  overdue: "#f59e0b",
};

const TONER: Record<string, string> = {
  low: "text-emerald-500",
  moderate: "text-amber-500",
  high: "text-orange-500",
  critical: "text-red-500",
};

function StatCard({ label, value, tone, delay }: { label: string; value: number; tone: string; delay: number }) {
  const animated = useCountUp(value);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${tone}`}>{animated}</p>
      </Card>
    </motion.div>
  );
}

function Gauge({ pct }: { pct: number }) {
  const animated = useCountUp(pct);
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#fff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{animated}</span>
        <span className="text-[10px] text-white/60 uppercase">score</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const summary = trpc.dashboard.summary.useQuery();
  const posture = trpc.dashboard.posture.useQuery();
  const heatmap = trpc.risk.heatmap.useQuery();
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);

  if (summary.isLoading) {
    return <p className="text-slate-500 animate-pulse">Loading your compliance cockpit…</p>;
  }

  const s = summary.data!;
  const postureData = posture.data ?? [];
  const avgScore = postureData.length ? Math.round(postureData.reduce((a, f) => a + f.pct, 0) / postureData.length) : 0;

  const donutData = [
    { name: "Healthy", value: s.control.health.healthy },
    { name: "Failing", value: s.control.health.failing },
    { name: "Untested", value: s.control.health.untested },
    { name: "Overdue", value: s.control.health.overdue },
  ].filter((d) => d.value > 0);

  const stats = [
    { label: "Total risks", value: s.risk.total, tone: "text-slate-900" },
    { label: "High + critical", value: s.risk.bands.high + s.risk.bands.critical, tone: TONER.critical },
    { label: "Control gaps", value: s.control.health.failing + s.control.health.overdue, tone: "text-amber-600" },
    { label: "Fresh evidence", value: s.evidence.fresh, tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white p-7">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-32 -bottom-24 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-8">
          <Gauge pct={avgScore} />
          <div>
            <h1 className="text-2xl font-bold">Compliance Cockpit</h1>
            <p className="text-sm text-indigo-100 mt-1">
              {avgScore >= 80 ? "Solid posture. Keep evidence fresh." : avgScore >= 50 ? "Moving the needle. Close the gaps." : "Early build-out. Prioritize your top risks."}
            </p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <p className="text-indigo-100 text-xs uppercase tracking-wide">Posture</p>
                <p className="font-semibold text-lg">{avgScore} / 100</p>
              </div>
              <div>
                <p className="text-indigo-100 text-xs uppercase tracking-wide">Frameworks</p>
                <p className="font-semibold text-lg">{postureData.length}</p>
              </div>
              <div>
                <p className="text-indigo-100 text-xs uppercase tracking-wide">Evidence fresh</p>
                <p className="font-semibold text-lg">{s.evidence.total ? Math.round((s.evidence.fresh / s.evidence.total) * 100) : 0}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((st, i) => (
          <StatCard key={st.label} label={st.label} value={st.value} tone={st.tone} delay={i * 0.06} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Risk Heat Map</h2>
          <Heatmap points={heatmap.data ?? []} onSelect={setSelectedRisk} />
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Control Health</h2>
            <div className="flex items-center gap-4">
              <div className="w-36 h-36">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={3} strokeWidth={0}>
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={HEALTH_COLORS[d.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 text-sm">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: HEALTH_COLORS[d.name] }} />
                    <span className="text-slate-600 capitalize">{d.name}</span>
                    <span className="ml-auto font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Top 10 Risks</h2>
            <ul className="space-y-1.5">
              {s.risk.topRisks.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelectedRisk(r.id)}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className={`font-bold text-sm w-7 ${TONER[r.band] ?? ""}`}>{r.residual}</span>
                    <span className="flex-1 text-sm text-slate-700 truncate">{r.title}</span>
                    <span className="text-xs capitalize text-slate-400">{r.treatment ?? "—"}</span>
                    <span className="text-slate-300">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Compliance Posture by Framework</h2>
        <div className="space-y-4">
          {(postureData.length ? postureData : [{ code: "ISO27001", pct: 0, satisfied: 0, total: 0, name: "ISO 27001" }]).map((f) => (
            <div key={f.code}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700 font-medium">
                  {f.code} <span className="text-slate-400 font-normal">— {f.satisfied}/{f.total} requirements</span>
                </span>
                <span className="text-slate-500 font-semibold">{f.pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${f.pct >= 80 ? "bg-emerald-500" : f.pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${f.pct}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {selectedRisk && (
          <RiskDrawer riskId={selectedRisk} onClose={() => setSelectedRisk(null)} onMutated={() => setSelectedRisk(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}