import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticateUser, requireAuth } from "../middlewares/auth";

console.log("AuthRoutes loaded.");

const router = Router();

// Public routes
router.post("/register", AuthController.register);
console.log("Registering POST /login route...");
router.post("/login", AuthController.login);
router.get("/user/:username", AuthController.getUserByUsername);
router.get("/verify", AuthController.verifyToken);

// Protected routes
router.use(authenticateUser, requireAuth);

router.get("/profile", AuthController.getProfile);
router.put("/profile", AuthController.updateProfile);

export default router;