import express from "express";
import {
  login,
  logout,
  signup,
  refreshToken,
  getProfile,
  uploadProfilePicture,
  deletarProfilePicture,
  updateEmail,
  updatePhone
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import limiter from "../middleware/limiter.js";
//import { verifyCaptcha } from "../middleware/recaptchaMiddleware.js";

const router = express.Router();

import { forceLogout } from "../controllers/auth.controller.js";
router.post("/force-logout", forceLogout);

// Rotas públicas
router.post("/signup", /*verifyCaptcha,*/ limiter, signup);
router.post("/login", /*verifyCaptcha,*/ limiter, login);
router.post("/refresh-token", refreshToken);

// Rotas protegidas
router.post("/logout", protectRoute, logout); // Melhor usar POST para logout
router.get("/profile", protectRoute, getProfile);

// Rotas de foto de perfil
router.post("/profile/picture", protectRoute, uploadProfilePicture);
router.delete("/profile/picture", protectRoute, deletarProfilePicture);

// Rotas de atualização de dados
router.put("/profile/email", protectRoute, updateEmail);
router.put("/profile/phone", protectRoute, updatePhone);
//router.put("/profile/name", protectRoute, updateName);
//router.put("/profile/password", protectRoute, updatePassword);

// Rotas adicionais sugeridas para dados pessoais completos
//router.put("/profile/personal-data", protectRoute, updatePersonalData); // fullName, cpf, birthDate
//router.post("/profile/personal-photo", protectRoute, uploadPersonalPhoto);
//router.post("/profile/extra-photo", protectRoute, uploadExtraPhoto);
//router.post("/profile/id-document", protectRoute, uploadIdDocument); // frente e verso do RG

// Rotas de verificação
//router.post("/verify-email", protectRoute, sendEmailVerification);
//router.post("/verify-email/confirm", verifyEmailToken);
//router.post("/verify-phone", protectRoute, sendPhoneVerification);
//router.post("/verify-phone/confirm", protectRoute, verifyPhoneToken);

// Rotas de saldo (quando implementar)
//router.get("/balance", protectRoute, getBalance);
//router.post("/balance/add", protectRoute, addBalance); // admin only

export default router;