"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.authenticateUser = void 0;
const authService_1 = require("../services/authService");
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }
        const token = authHeader.substring(7);
        // Verify the JWT token using AuthService
        const user = await authService_1.AuthService.verifyToken(token);
        // Add user info to request
        req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
        };
        next();
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ error: "Invalid token" });
    }
};
exports.authenticateUser = authenticateUser;
const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    next();
};
exports.requireAuth = requireAuth;
