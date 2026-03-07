import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import VendorProfile from "../models/admin.model.js";
import redis from "../db/redis.js";

// ============================================
// 1. AUTENTICAÇÃO - verifica se está logado
// ============================================
export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        message: "Não autorizado: Token não encontrado",
        code: "NO_TOKEN"
      });
    }

    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(401).json({
          message: "Usuário não encontrado",
          code: "USER_DELETED"
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          message: "Conta desativada",
          code: "ACCOUNT_INACTIVE"
        });
      }

      if (user.isBanned) {
        return res.status(403).json({
          message: `Conta banida: ${user.banReason || "Violação dos termos"}`,
          code: "ACCOUNT_BANNED"
        });
      }

      if (user.isLocked()) {
        const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
        return res.status(423).json({
          message: `Conta bloqueada. Tente novamente em ${timeLeft} minutos.`,
          code: "ACCOUNT_LOCKED"
        });
      }

      req.user = user;
      next();

    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Token expirado",
          code: "TOKEN_EXPIRED"
        });
      }
      throw error;
    }

  } catch (error) {
    console.error("Erro no protectRoute:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// ============================================
// 2. AUTORIZAÇÃO - vendor verificado e aprovado
// Usado nas futuras rotas de vendedor
// ============================================
export const isVerifiedVendor = async (req, res, next) => {
  try {
    if (!req.user.role.includes("vendor")) {
      return res.status(403).json({
        message: "Acesso restrito a vendedores",
        code: "VENDOR_ONLY"
      });
    }

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(403).json({
        message: "Perfil de vendedor não encontrado",
        code: "VENDOR_PROFILE_NOT_FOUND"
      });
    }

    if (vendorProfile.verificationStatus !== "approved") {
      return res.status(403).json({
        message: "Perfil de vendedor ainda não aprovado",
        code: "VENDOR_NOT_APPROVED",
        verificationStatus: vendorProfile.verificationStatus
      });
    }

    if (!vendorProfile.isActive) {
      return res.status(403).json({
        message: "Conta de vendedor inativa",
        code: "VENDOR_INACTIVE"
      });
    }

    // Injeta no request para evitar query dupla nos controllers
    req.vendorProfile = vendorProfile;
    next();

  } catch (error) {
    console.error("Erro no isVerifiedVendor:", error);
    res.status(500).json({ message: "Erro ao verificar permissões" });
  }
};

// ============================================
// 3. DONO DO PRODUTO
// Usado nas futuras rotas de produto do vendedor
// ============================================
export const isProductOwner = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Se isVerifiedVendor já rodou antes, reutiliza o perfil
    const vendorProfile = req.vendorProfile || 
      await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({
        message: "Perfil de vendedor não encontrado",
        code: "VENDOR_PROFILE_NOT_FOUND"
      });
    }

    const product = vendorProfile.products.id(productId);

    if (!product) {
      return res.status(404).json({
        message: "Produto não encontrado ou sem permissão",
        code: "PRODUCT_NOT_FOUND"
      });
    }

    req.vendorProfile = vendorProfile;
    req.product = product;
    next();

  } catch (error) {
    console.error("Erro no isProductOwner:", error);
    res.status(500).json({ message: "Erro ao verificar produto" });
  }
};

// ============================================
// 4. VERIFICAÇÕES DE CONTA
// Úteis para ações sensíveis
// ============================================
export const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      message: "Verifique seu email antes de continuar",
      code: "EMAIL_NOT_VERIFIED",
      email: req.user.email
    });
  }
  next();
};

export const requirePhoneVerified = (req, res, next) => {
  if (!req.user.phoneVerified) {
    return res.status(403).json({
      message: "Verifique seu telefone antes de continuar",
      code: "PHONE_NOT_VERIFIED"
    });
  }
  next();
};

// ============================================
// 5. RATE LIMIT - usando Redis (já tem no projeto)
// ============================================
export const rateLimit = (maxRequests = 10, windowSeconds = 60) => {
  return async (req, res, next) => {
    try {
      const key = `rate_limit:${req.user?._id || req.ip}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (current > maxRequests) {
        return res.status(429).json({
          message: "Muitas requisições. Tente novamente mais tarde.",
          code: "RATE_LIMIT_EXCEEDED"
        });
      }

      next();
    } catch (error) {
      console.error("Erro no rateLimit:", error);
      next(); // não bloqueia se Redis falhar
    }
  };
};