"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
// Load env once; adjust path only if you really keep .env outside the backend folder
dotenv_1.default.config({ path: "./backend/.env" });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_* key in environment.");
}
console.log("Supabase configuration:", {
    url: `${supabaseUrl.slice(0, 20)}...`,
    key: `${supabaseKey.slice(0, 20)}...`,
});
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
// ---- Optional connectivity check (Kanban schema) ----
// Keep this in dev only to avoid noisy logs in prod.
if (process.env.NODE_ENV !== "production") {
    (async () => {
        try {
            console.log("Testing Supabase connection (boards)…");
            const { count, error } = await exports.supabase
                .from("boards")
                .select("*", { count: "exact", head: true });
            if (error) {
                console.error("Supabase connection test failed:", {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                });
            }
            else {
                console.log("Supabase OK. 'boards' table accessible. Count:", count ?? 0);
            }
        }
        catch (e) {
            console.error("Supabase connection test error:", e);
        }
    })();
}
