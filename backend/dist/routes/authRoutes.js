"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
console.log("AuthRoutes loaded.");
const router = (0, express_1.Router)();
// Public routes
router.post("/register", authController_1.AuthController.register);
console.log("Registering POST /login route...");
router.post("/login", authController_1.AuthController.login);
router.get("/user/:username", authController_1.AuthController.getUserByUsername);
router.get("/verify", authController_1.AuthController.verifyToken);
// Protected routes
router.use(auth_1.authenticateUser, auth_1.requireAuth);
router.get("/profile", authController_1.AuthController.getProfile);
router.put("/profile", authController_1.AuthController.updateProfile);
exports.default = router;
