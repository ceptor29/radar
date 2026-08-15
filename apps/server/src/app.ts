import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app";
import { createContext } from "./context";
import { restApi } from "./rest";

export function createApp(): express.Express {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => createContext({ req }),
    }),
  );

  app.use("/api", restApi);

  return app;
}
