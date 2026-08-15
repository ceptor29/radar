import { motion } from "motion/react";
import { trpc } from "../api/trpc";
import { Card, Badge } from "../components/ui";

export default function Activity() {
  const activities = trpc.activity.list.useQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-sm text-slate-500">Every decision, correction, and recalculation — append-only.</p>
      </div>

      <Card className="p-5">
        {!activities.data?.length && <p className="text-slate-400 text-sm">No activity yet.</p>}
        <ol className="relative border-l border-slate-200 ml-3 space-y-5">
          {(activities.data ?? []).map((a) => (
            <li key={a.id} className="ml-6">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bg-slate-100 text-slate-600">{a.action}</Badge>
                <span className="text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{a.summary}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}