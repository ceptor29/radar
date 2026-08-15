import { Outlet, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { trpc, clearToken, getToken } from "../api/trpc";

const ICONS: Record<string, string> = {
  "/": "◧",
  "/risks": "◎",
  "/controls": "▤",
  "/evidence": "▣",
  "/activity": "≡",
};

const NAV = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/risks", label: "Risk Register" },
  { to: "/controls", label: "Controls" },
  { to: "/evidence", label: "Evidence" },
  { to: "/activity", label: "Activity Log" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = trpc.auth.me.useQuery(undefined, { retry: false });
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      clearToken();
      navigate("/login", { replace: true });
    },
  });

  if (!getToken()) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-60 bg-slate-950 text-slate-300 flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-white/10">
          <p className="text-lg font-bold text-white tracking-tight">
            Radar
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">collect once, comply many</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  active ? "text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/10 rounded-xl ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative text-base">{ICONS[item.to]}</span>
                <span className="relative font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="px-6 py-5 border-t border-white/10 text-sm">
          <p className="text-slate-200 truncate">{me.data?.user?.email ?? ""}</p>
          <p className="text-[11px] text-slate-500 mb-2">{me.data?.roles?.join(", ") ?? ""}</p>
          <button
            onClick={() => logout.mutate()}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="max-w-6xl mx-auto px-8 py-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}