import { router } from "../trpc";
import { authRouter } from "./auth";
import { riskRouter } from "./risk";
import { controlRouter } from "./control";
import { frameworkRouter } from "./framework";
import { evidenceRouter } from "./evidence";
import { dashboardRouter } from "./dashboard";
import { activityRouter } from "./activity";
import { adminRouter } from "./admin";
import { directoryRouter } from "./directory";

export const appRouter = router({
  auth: authRouter,
  risk: riskRouter,
  control: controlRouter,
  framework: frameworkRouter,
  evidence: evidenceRouter,
  dashboard: dashboardRouter,
  activity: activityRouter,
  admin: adminRouter,
  directory: directoryRouter,
});

export type AppRouter = typeof appRouter;
