// ============================================
// ARQUIVO: routes/auth.routes.js
// ROTAS DE AUTENTICAÇÃO DE USUÁRIOS (NÃO É PAINEL ADMIN!)
// ============================================

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
  updatePhone,
  forceLogout,
  sendEmailVerificationCode,
  verifyEmailCode,
  resendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyPhoneCodeController,
  resendPhoneVerificationCode,
  submitVendorApplication,
  getVendorApplicationStatus
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// ============================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ============================================

// Autenticação básica
router.post("/signup", signup);
router.post("/login", login);
router.post("/refresh-token", refreshToken);

// ============================================
// ROTAS PROTEGIDAS (REQUER LOGIN)
// ============================================

// Perfil e sessão
router.get("/profile", protectRoute, getProfile);
router.post("/logout", protectRoute, logout);
router.post("/force-logout", protectRoute, forceLogout);

// Foto de perfil
router.post("/profile/picture", protectRoute, uploadProfilePicture);
router.delete("/profile/picture", protectRoute, deletarProfilePicture);

// Atualizar dados pessoais
router.put("/profile/email", protectRoute, updateEmail);
router.put("/update-phone", protectRoute, updatePhone);

// Verificação de email
router.post("/send-email-verification", protectRoute, sendEmailVerificationCode);
router.post("/verify-email", protectRoute, verifyEmailCode);
router.post("/resend-email-verification", protectRoute, resendEmailVerificationCode);

// Verificação de telefone (SMS)
router.post("/send-phone-verification", protectRoute, sendPhoneVerificationCode);
router.post("/verify-phone", protectRoute, verifyPhoneCodeController);
router.post("/resend-phone-verification", protectRoute, resendPhoneVerificationCode);

router.post("/submit-vendor-application", protectRoute, submitVendorApplication);
router.get("/vendor-application-status", protectRoute, getVendorApplicationStatus);

export default router;