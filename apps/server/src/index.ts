import { migrate } from "./db/migrate";
import { createApp } from "./app";

migrate();

const PORT = Number(process.env.RADAR_PORT ?? 4000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`Radar server listening on http://localhost:${PORT}`);
  console.log(`  tRPC:      http://localhost:${PORT}/trpc`);
  console.log(`  REST:      http://localhost:${PORT}/api/v1/risks`);
  console.log("Run `npm run seed` to load demo data.");
});
