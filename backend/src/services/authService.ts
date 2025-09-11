import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabaseClient";
import { Profile } from "../types/database";

export interface AuthResponse {
  user: Omit<Profile, "password_hash">;
  token: string;
}

type JwtUser = { id: string; email: string; username: string };

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  private static readonly JWT_EXPIRES_IN = "7d";

  // ---------- Auth flows ----------

  static async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data: user, error } = await supabase
      .from("profiles")
      .insert({ username, email, password_hash })
      .select("id, username, email, created_at, updated_at")
      .single();

    if (error) {
      if ((error as any).code === "23505") throw new Error("Username or email already exists");
      throw error;
    }
    if (!user) throw new Error("Failed to create user");

    const token = this.signToken({ id: user.id, email: user.email, username: user.username });
    return { user, token };
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const { data: row, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !row) throw new Error("Invalid email or password");

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new Error("Invalid email or password");

    const { password_hash, ...user } = row as Profile & { password_hash: string };
    const token = this.signToken({ id: user.id, email: user.email, username: user.username });
    return { user, token };
  }

  // ---------- Token helpers ----------

  static signToken(payload: JwtUser): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  /**
   * Verify JWT and return the embedded user identity.
   * No DB call here — keeps every request fast.
   */
  static async verifyToken(token: string): Promise<JwtUser> {
    const decoded = jwt.verify(token, this.JWT_SECRET) as JwtUser;
    if (!decoded?.id || !decoded?.email || !decoded?.username) {
      throw new Error("Invalid token");
    }
    return decoded;
  }

  // ---------- Profile utilities (used when you actually need fresh DB state) ----------

  static async getUserById(userId: string): Promise<Omit<Profile, "password_hash"> | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, created_at, updated_at")
      .eq("id", userId)
      .single();
    if (error) return null;
    return data;
  }

  static async updateProfile(
    userId: string,
    updates: { username?: string; email?: string }
  ): Promise<Omit<Profile, "password_hash">> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id, username, email, created_at, updated_at")
      .single();

    if (error) {
      if ((error as any).code === "23505") throw new Error("Username or email already exists");
      throw error;
    }
    return data!;
  }

  static async getUserByUsername(username: string): Promise<Omit<Profile, "password_hash"> | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, email, created_at, updated_at")
      .eq("username", username)
      .single();
    if (error) return null;
    return data;
  }
}
