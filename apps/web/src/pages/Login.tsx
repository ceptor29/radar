import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { trpc, setToken } from "../api/trpc";

const DEMO_ACCOUNTS = [
  ["admin@acme.io", "Admin", "👩‍💼"],
  ["lead@acme.io", "Compliance Lead", "🧭"],
  ["owner@acme.io", "Control Owner", "🔧"],
  ["auditor@acme.io", "Auditor", "🔍"],
];

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@acme.io");
  const [error, setError] = useState<string | null>(null);
  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setToken(data.token);
      navigate("/", { replace: true });
    },
    onError: (err) => setError(err.message),
  });

  const doLogin = (em: string) => {
    setError(null);
    login.mutate({ email: em });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-600/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8"
      >
        <p className="text-2xl font-bold text-slate-900">
          Aegis <span className="text-indigo-600">GRC</span>
        </p>
        <p className="text-sm text-slate-500 mb-6">Governance · Risk · Compliance</p>

        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doLogin(email)}
        />
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-red-600 mb-3">
            {error}
          </motion.p>
        )}
        <button
          onClick={() => doLogin(email)}
          disabled={login.isPending}
          className="w-full bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>

        <div className="mt-6">
          <p className="text-xs text-slate-400 mb-2">Demo workspace — pick a persona</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map(([em, label, icon]) => (
              <button
                key={em as string}
                onClick={() => doLogin(em as string)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <span className="text-base">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}