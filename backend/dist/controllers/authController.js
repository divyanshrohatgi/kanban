"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
const validator_1 = __importDefault(require("validator"));
class AuthController {
    // Register a new user
    static async register(req, res) {
        try {
            const { username, email, password } = req.body;
            // Validate input
            if (!username || !email || !password) {
                return res.status(400).json({
                    error: "Username, email, and password are required",
                });
            }
            if (username.length < 3) {
                return res.status(400).json({
                    error: "Username must be at least 3 characters long",
                });
            }
            if (password.length < 6) {
                return res.status(400).json({
                    error: "Password must be at least 6 characters long",
                });
            }
            // Email validation
            if (!validator_1.default.isEmail(email)) {
                return res.status(400).json({
                    error: "Invalid email format",
                });
            }
            const result = await authService_1.AuthService.register(username, email, password);
            res.status(201).json({
                message: "User registered successfully",
                user: result.user,
                token: result.token,
            });
        }
        catch (error) {
            console.error("Registration error:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Registration failed",
            });
        }
    }
    // Login user
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            // Validate input
            if (!email || !password) {
                return res.status(400).json({
                    error: "Email and password are required",
                });
            }
            const result = await authService_1.AuthService.login(email, password);
            res.json({
                message: "Login successful",
                user: result.user,
                token: result.token,
            });
        }
        catch (error) {
            console.error("Login error:", error);
            res.status(401).json({
                error: error instanceof Error ? error.message : "Login failed",
            });
        }
    }
    // Get current user profile
    static async getProfile(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const user = await authService_1.AuthService.getUserById(req.user.id);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json(user);
        }
        catch (error) {
            console.error("Get profile error:", error);
            res.status(500).json({
                error: error instanceof Error ? error.message : "Failed to fetch profile",
            });
        }
    }
    // Update user profile
    static async updateProfile(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }
            const { username, email } = req.body;
            // Validate username length
            if (username && username.length < 3) {
                return res.status(400).json({
                    error: "Username must be at least 3 characters long",
                });
            }
            // Email validation
            if (email) {
                if (!validator_1.default.isEmail(email)) {
                    return res.status(400).json({
                        error: "Invalid email format",
                    });
                }
            }
            const updates = {};
            if (username)
                updates.username = username;
            if (email)
                updates.email = email;
            const user = await authService_1.AuthService.updateProfile(req.user.id, updates);
            res.json({
                message: "Profile updated successfully",
                user,
            });
        }
        catch (error) {
            console.error("Update profile error:", error);
            res.status(400).json({
                error: error instanceof Error ? error.message : "Failed to update profile",
            });
        }
    }
    static async getUserByUsername(req, res) {
        try {
            const { username } = req.params;
            if (!username) {
                return res.status(400).json({ error: "Username is required" });
            }
            const user = await authService_1.AuthService.getUserByUsername(username);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            res.json(user);
        }
        catch (error) {
            console.error("Get user by username error:", error);
            res.status(500).json({ error: "Failed to fetch user" });
        }
    }
    static async verifyToken(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({ error: "No token provided" });
            }
            const token = authHeader.substring(7);
            const user = await authService_1.AuthService.verifyToken(token);
            res.json({
                message: "Token is valid",
                user,
            });
        }
        catch (error) {
            console.error("Token verification error:", error);
            res.status(401).json({
                error: error instanceof Error ? error.message : "Invalid token",
            });
        }
    }
}
exports.AuthController = AuthController;
