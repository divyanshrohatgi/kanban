"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const supabaseClient_1 = require("../config/supabaseClient");
class AuthService {
    // ---------- Auth flows ----------
    static async register(username, email, password) {
        const saltRounds = 12;
        const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
        const { data: user, error } = await supabaseClient_1.supabase
            .from("profiles")
            .insert({ username, email, password_hash })
            .select("id, username, email, created_at, updated_at")
            .single();
        if (error) {
            if (error.code === "23505")
                throw new Error("Username or email already exists");
            throw error;
        }
        if (!user)
            throw new Error("Failed to create user");
        const token = this.signToken({ id: user.id, email: user.email, username: user.username });
        return { user, token };
    }
    static async login(email, password) {
        const { data: row, error } = await supabaseClient_1.supabase
            .from("profiles")
            .select("*")
            .eq("email", email)
            .single();
        if (error || !row)
            throw new Error("Invalid email or password");
        const ok = await bcryptjs_1.default.compare(password, row.password_hash);
        if (!ok)
            throw new Error("Invalid email or password");
        const { password_hash, ...user } = row;
        const token = this.signToken({ id: user.id, email: user.email, username: user.username });
        return { user, token };
    }
    // ---------- Token helpers ----------
    static signToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    }
    /**
     * Verify JWT and return the embedded user identity.
     * No DB call here — keeps every request fast.
     */
    static async verifyToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
        if (!decoded?.id || !decoded?.email || !decoded?.username) {
            throw new Error("Invalid token");
        }
        return decoded;
    }
    // ---------- Profile utilities (used when you actually need fresh DB state) ----------
    static async getUserById(userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from("profiles")
            .select("id, username, email, created_at, updated_at")
            .eq("id", userId)
            .single();
        if (error)
            return null;
        return data;
    }
    static async updateProfile(userId, updates) {
        const { data, error } = await supabaseClient_1.supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId)
            .select("id, username, email, created_at, updated_at")
            .single();
        if (error) {
            if (error.code === "23505")
                throw new Error("Username or email already exists");
            throw error;
        }
        return data;
    }
    static async getUserByUsername(username) {
        const { data, error } = await supabaseClient_1.supabase
            .from("profiles")
            .select("id, username, email, created_at, updated_at")
            .eq("username", username)
            .single();
        if (error)
            return null;
        return data;
    }
}
exports.AuthService = AuthService;
AuthService.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
AuthService.JWT_EXPIRES_IN = "7d";
