import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load env once; adjust path only if you really keep .env outside the backend folder
dotenv.config({ path: "./backend/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_* key in environment.");
}

console.log("Supabase configuration:", {
  url: `${supabaseUrl.slice(0, 20)}...`,
  key: `${supabaseKey.slice(0, 20)}...`,
});

export const supabase = createClient(supabaseUrl, supabaseKey);

// ---- Optional connectivity check (Kanban schema) ----
// Keep this in dev only to avoid noisy logs in prod.
if (process.env.NODE_ENV !== "production") {
  (async () => {
    try {
      console.log("Testing Supabase connection (boards)…");
      const { count, error } = await supabase
        .from("boards")
        .select("*", { count: "exact", head: true });

      if (error) {
        console.error("Supabase connection test failed:", {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
        });
      } else {
        console.log("Supabase OK. 'boards' table accessible. Count:", count ?? 0);
      }
    } catch (e) {
      console.error("Supabase connection test error:", e);
    }
  })();
}
