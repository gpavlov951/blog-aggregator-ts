import { defineConfig } from "drizzle-kit";
import { readConfig } from "./src/config";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./src/lib/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: readConfig().dbUrl,
  },
});
