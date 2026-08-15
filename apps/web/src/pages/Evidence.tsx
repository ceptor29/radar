import { useState, useCallback } from "react";
import { motion } from "motion/react";
import toast from "react-hot-toast";
import { trpc } from "../api/trpc";
import { Card, Badge } from "../components/ui";

export default function Evidence() {
  const utils = trpc.useUtils();
  const evidence = trpc.evidence.list.useQuery();
  const controls = trpc.control.list.useQuery();
  const freshness = trpc.evidence.freshness.useQuery();
  const upload = trpc.evidence.upload.useMutation({
    onSuccess: () => {
      utils.evidence.list.invalidate();
      utils.evidence.freshness.invalidate();
      utils.dashboard.summary.invalidate();
      toast.success("Evidence filed — SHA-256 pinned");
    },
    onError: (e) => toast.error(e.message),
  });

  const [controlId, setControlId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);

  const doFile = useCallback(
    (file: File) => {
      setFileInfo({ name: file.name, size: file.size });
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        if (!controlId) return toast.error("Select a control first");
        upload.mutate({ controlId, fileName: file.name, content: base64, mime: file.type });
        setFileInfo(null);
      };
      reader.readAsDataURL(file);
    },
    [controlId, upload],
  );

  const fr = freshness.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evidence Repository</h1>
        <p className="text-sm text-slate-500">Drag a file in. Every item is immutable and content-hashed.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total items", value: fr?.total ?? "…", tone: "text-slate-900" },
          { label: "Fresh", value: fr?.fresh ?? "…", tone: "text-emerald-600" },
          { label: "Expiring ≤ 30d", value: fr?.expiring ?? "…", tone: fr && fr.expiring > 0 ? "text-amber-600" : "text-slate-900" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.tone}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <select
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          value={controlId}
          onChange={(e) => setControlId(e.target.value)}
        >
          <option value="">Select target control…</option>
          {(controls.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) doFile(f);
        }}
        animate={{ scale: dragging ? 1.02 : 1 }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-3xl mb-2">📄</p>
        <p className="text-sm text-slate-600 font-medium">
          {fileInfo ? `Filing ${fileInfo.name} (${(fileInfo.size / 1024).toFixed(1)} KB)…` : "Drag & drop evidence here"}
        </p>
        <label className="inline-block mt-3 cursor-pointer">
          <span className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800">
            or browse files
          </span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doFile(f);
            }}
          />
        </label>
        {!controlId && <p className="text-xs text-amber-600 mt-3">You must select a control before dropping a file.</p>}
      </motion.div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 bg-slate-50">
              <th className="px-5 py-3">File</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Valid until</th>
              <th className="px-5 py-3">SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {(evidence.data ?? []).map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-medium text-slate-800">{e.s3Ref.replace("evidence/", "")}</td>
                <td className="px-5 py-3">
                  <Badge tone={e.type === "auto" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}>
                    {e.type === "auto" ? "⚙ automated" : "✎ manual"}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone="bg-emerald-50 text-emerald-700 ring-emerald-200">{e.status}</Badge>
                </td>
                <td className="px-5 py-3 text-slate-500">
                  {e.validUntil
                    ? new Date(e.validUntil).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-5 py-3 text-slate-400 font-mono text-xs">{e.sha256.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}