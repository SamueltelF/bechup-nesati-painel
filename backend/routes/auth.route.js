import express from "express";

// Controllers
import {
  login,
  logout,
  signup,
  refreshToken,
  getProfile,
  uploadProfilePicture,
  deletarProfilePicture,
  updateEmail,
  updatePhone,
  forceLogout
} from "../controllers/auth.controller.js";

// Middlewares
import { 
  protectRoute, 
  requirePhoneVerified,
  rateLimit 
} from "../middleware/auth.middleware.js";

// Limiter customizado (seu arquivo existente)
import limiter from "../middleware/limiter.js";

const router = express.Router();

// ============================================
// ROTAS PÚBLICAS (Não requerem autenticação)
// ============================================

/**
 * Criar nova conta
 * Rate limit: Use seu limiter customizado
 */
router.post("/signup", 
  limiter, 
  signup
);

/**
 * Login
 * Rate limit: Use seu limiter customizado
 */
router.post("/login", 
  limiter, 
  login
);

/**
 * Renovar access token usando refresh token
 * Não precisa de protectRoute (usa cookie refreshToken)
 */
router.post("/refresh-token", 
  refreshToken
);

/**
 * Logout forçado (limpa cookies sem verificar token)
 * Útil para quando o token está inválido/corrompido
 */
router.post("/force-logout", 
  forceLogout
);

// ============================================
// ROTAS PROTEGIDAS (Requerem autenticação)
// ============================================

/**
 * Logout normal
 * POST é mais correto semanticamente para logout
 */
router.post("/logout", 
  protectRoute, 
  logout
);

/**
 * Buscar perfil do usuário logado
 */
router.get("/profile", 
  protectRoute, 
  getProfile
);

// ============================================
// FOTO DE PERFIL
// ============================================

/**
 * Upload de foto de perfil pública
 * Qualquer usuário pode fazer upload
 */
router.post("/profile/picture", 
  protectRoute, 
  uploadProfilePicture
);

/**
 * Deletar foto de perfil
 */
router.delete("/profile/picture", 
  protectRoute, 
  deletarProfilePicture
);

// ============================================
// ATUALIZAÇÃO DE DADOS PESSOAIS
// ============================================

/**
 * Atualizar email
 * IMPORTANTE: Requer telefone verificado (segurança)
 */
router.put("/profile/email", 
  protectRoute, 
  requirePhoneVerified, 
  updateEmail
);

/**
 * Atualizar/Adicionar/Remover telefone
 * Se enviar phone vazio, remove o telefone
 */
router.put("/profile/phone", 
  protectRoute, 
  updatePhone
);

// ============================================
// ROTAS FUTURAS (Comentadas para implementação)
// ============================================

// VERIFICAÇÃO DE EMAIL/TELEFONE
// router.post("/verify-email/send", protectRoute, sendEmailVerification);
// router.post("/verify-email/confirm", protectRoute, verifyEmailCode);
// router.post("/verify-phone/send", protectRoute, requirePhone, sendPhoneVerification);
// router.post("/verify-phone/confirm", protectRoute, verifyPhoneCode);

// RECUPERAÇÃO DE SENHA
// router.post("/forgot-password", limiter, sendPasswordResetEmail);
// router.post("/reset-password", resetPassword);

// ATUALIZAÇÃO DE OUTROS DADOS
// router.put("/profile/name", protectRoute, updateName);
// router.put("/profile/password", protectRoute, updatePassword);

// ENDEREÇOS (Para compras)
// router.get("/profile/addresses", protectRoute, getAddresses);
// router.post("/profile/addresses", protectRoute, addAddress);
// router.put("/profile/addresses/:addressId", protectRoute, updateAddress);
// router.delete("/profile/addresses/:addressId", protectRoute, deleteAddress);

// PREFERÊNCIAS
// router.get("/profile/preferences", protectRoute, getPreferences);
// router.put("/profile/preferences", protectRoute, updatePreferences);

export default router;