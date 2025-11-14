// routes/auth.routes.js
import express from "express";
import { 
  signup, 
  login, 
  logout, 
  refreshToken, 
  getProfile,
  uploadProfilePicture,
  deletarProfilePicture,
  updateEmail,
  forceLogout,
  updatePhone,
  // Novos endpoints de verificação
  sendEmailVerificationCode,
  verifyEmailCode,
  resendEmailVerificationCode
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Rotas existentes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/force-logout", forceLogout);

// Rotas protegidas existentes
router.get("/profile", protectRoute, getProfile);
router.post("/upload-profile-picture", protectRoute, uploadProfilePicture);
router.delete("/delete-profile-picture", protectRoute, deletarProfilePicture);
router.put("/update-email", protectRoute, updateEmail);
router.put("/update-phone", protectRoute, updatePhone);

// ===== NOVAS ROTAS DE VERIFICAÇÃO DE EMAIL =====
router.post("/send-email-verification", protectRoute, sendEmailVerificationCode);
router.post("/verify-email", protectRoute, verifyEmailCode);
router.post("/resend-email-verification", protectRoute, resendEmailVerificationCode);

export default router;