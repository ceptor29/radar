import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, makeTRPCClient } from "./api/trpc";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Risks from "./pages/Risks";
import Controls from "./pages/Controls";
import Evidence from "./pages/Evidence";
import Activity from "./pages/Activity";

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => makeTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-center" toastOptions={{ style: { borderRadius: "12px" } }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/risks" element={<Risks />} />
            <Route path="/controls" element={<Controls />} />
            <Route path="/evidence" element={<Evidence />} />
            <Route path="/activity" element={<Activity />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
