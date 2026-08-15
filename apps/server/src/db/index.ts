import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.resolve(import.meta.dirname, "../../data");
fs.mkdirSync(dataDir, { recursive: true });

export const sqlite = new Database(path.join(dataDir, "radar.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;

export function getDb(): DB {
  return db;
}
