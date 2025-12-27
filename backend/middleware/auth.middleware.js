import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import VendorProfile from "../models/admin.model.js";


// AUTENTICAÇÃO BÁSICA


/**
 * Protege rotas - verifica se usuário está autenticado
 */
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
      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_ACCESS_TOKEN_SECRET
      );
     
      const user = await User.findById(decoded.userId).select("-password");
     
      if (!user) {
        // USUÁRIO FOI DELETADO - Limpar cookies
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
       
        return res.status(401).json({
          message: "Usuário não encontrado - Conta pode ter sido deletada",
          code: "USER_DELETED"
        });
      }

      // Verificar se conta está ativa
      if (!user.isActive) {
        return res.status(403).json({
          message: "Conta desativada",
          code: "ACCOUNT_INACTIVE"
        });
      }

      // Verificar se conta está banida
      if (user.isBanned) {
        return res.status(403).json({
          message: "Conta banida",
          code: "ACCOUNT_BANNED",
          reason: user.banReason
        });
      }

      // Verificar se conta está bloqueada (múltiplas tentativas)
      if (user.isLocked && user.isLocked()) {
        return res.status(423).json({
          message: "Conta temporariamente bloqueada por múltiplas tentativas de login",
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
    console.log("Erro no middleware protectRoute:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message,
    });
  }
};


// AUTORIZAÇÃO POR ROLE (NOVO SISTEMA)

/**
 * Verifica se usuário tem role de vendedor
 */
export const isVendor = (req, res, next) => {
  if (req.user && req.user.role.includes("vendor")) {
    next();
  } else {
    return res.status(403).json({
      message: "Acesso negado. Apenas vendedores podem acessar.",
      code: "VENDOR_ONLY"
    });
  }
};

/**
 * Verifica se usuário é vendedor E está aprovado/ativo
 */
export const isVerifiedVendor = async (req, res, next) => {
  try {
    // Primeiro verifica se tem role de vendedor
    if (!req.user || !req.user.role.includes("vendor")) {
      return res.status(403).json({
        message: "Acesso negado. Apenas vendedores podem acessar.",
        code: "VENDOR_ONLY"
      });
    }

    // Buscar perfil de vendedor
    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(403).json({
        message: "Perfil de vendedor não encontrado. Crie seu perfil primeiro.",
        code: "VENDOR_PROFILE_NOT_FOUND"
      });
    }

    // Verificar status de aprovação
    if (vendorProfile.verificationStatus !== "approved") {
      return res.status(403).json({
        message: "Seu perfil de vendedor ainda não foi aprovado",
        code: "VENDOR_NOT_APPROVED",
        verificationStatus: vendorProfile.verificationStatus,
        rejectionReason: vendorProfile.rejectionReason
      });
    }

    // Verificar se conta está ativa
    if (!vendorProfile.isActive) {
      return res.status(403).json({
        message: "Sua conta de vendedor está inativa. Entre em contato com o suporte.",
        code: "VENDOR_INACTIVE"
      });
    }

    // Adicionar vendorProfile no request para uso posterior
    req.vendorProfile = vendorProfile;
    next();

  } catch (error) {
    console.log("Erro no middleware isVerifiedVendor:", error);
    res.status(500).json({
      message: "Erro ao verificar permissões",
      error: error.message
    });
  }
};

/**
 * Verifica se usuário tem role de admin
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role.includes("admin")) {
    next();
  } else {
    return res.status(403).json({
      message: "Acesso negado. Apenas administradores.",
      code: "ADMIN_ONLY"
    });
  }
};


export const isSuperAdmin = (req, res, next) => {
  // Verificar se é admin primeiro
  if (!req.user || !req.user.role.includes("admin")) {
    return res.status(403).json({
      message: "Acesso negado. Apenas administradores.",
      code: "ADMIN_ONLY"
    });
  }

  
  if (req.user.isSuperAdmin) {
    return next();
  }

  
  const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || [];
 
  if (SUPER_ADMIN_IDS.length === 0) {

    return res.status(403).json({
      message: "Sistema de super administradores não configurado.",
      code: "SUPER_ADMIN_NOT_CONFIGURED"
    });
  }

  if (!SUPER_ADMIN_IDS.includes(req.user._id.toString())) {
    return res.status(403).json({
      message: "Acesso negado. Apenas super administradores podem aprovar vendedores.",
      code: "SUPER_ADMIN_ONLY"
    });
  }

  next();
};


// COMPATIBILIDADE COM CÓDIGO ANTIGO


/**
 * @deprecated Use isAdmin ao invés
 * Mantido para compatibilidade com código antigo
 */
export const adminRoute = (req, res, next) => {
  console.warn("⚠️  adminRoute está deprecated, use isAdmin");
  return isAdmin(req, res, next);
};

/**
 * @deprecated Use isVerifiedVendor ao invés
 * Mantido para compatibilidade com código antigo
 */
export const isVerifiedAdmin = async (req, res, next) => {
  console.warn("⚠️  isVerifiedAdmin está deprecated, use isVerifiedVendor");
  return isVerifiedVendor(req, res, next);
};


// VERIFICAÇÕES ADICIONAIS


/**
 * Verifica se email está verificado
 */
export const requireEmailVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      message: "Email não verificado. Verifique seu email antes de continuar.",
      code: "EMAIL_NOT_VERIFIED",
      email: req.user.email
    });
  }
  next();
};

/**
 * Verifica se telefone está verificado
 */
export const requirePhoneVerified = (req, res, next) => {
  if (!req.user.phoneVerified) {
    return res.status(403).json({
      message: "Telefone não verificado. Verifique seu telefone antes de continuar.",
      code: "PHONE_NOT_VERIFIED",
      phone: req.user.phone
    });
  }
  next();
};

/**
 * Verifica se usuário tem telefone cadastrado
 */
export const requirePhone = (req, res, next) => {
  if (!req.user.phone) {
    return res.status(400).json({
      message: "Telefone não cadastrado. Adicione um telefone antes de continuar.",
      code: "PHONE_REQUIRED"
    });
  }
  next();
};

// GERENCIAMENTO DE RECURSOS

/**
 * Verifica se usuário pode gerenciar um recurso
 * (é o dono OU é super admin)
 * 
 * @param {Function|String} getResourceUserId - Função que retorna userId do recurso ou userId direto
 * @returns {Function} Middleware
 */
export const canManageResource = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Obter o userId do recurso
      const resourceUserId = typeof getResourceUserId === 'function'
        ? await getResourceUserId(req)
        : getResourceUserId;

      // Verificar se é o dono
      const isOwner = req.user._id.toString() === resourceUserId.toString();

      if (isOwner) {
        return next();
      }

      // Verificar se é super admin
      if (req.user.isSuperAdmin) {
        return next();
      }

      const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || [];
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(req.user._id.toString());

      if (isSuperAdmin) {
        return next();
      }

      // Nem dono nem super admin
      return res.status(403).json({
        message: "Você não tem permissão para gerenciar este recurso",
        code: "FORBIDDEN"
      });

    } catch (error) {
      console.log("Erro no middleware canManageResource:", error);
      res.status(500).json({
        message: "Erro ao verificar permissões",
        error: error.message
      });
    }
  };
};

/**
 * Verifica se usuário é dono do produto
 */
export const isProductOwner = async (req, res, next) => {
  try {
    const { productId } = req.params;
    
    const vendorProfile = await VendorProfile.findOne({ 
      userId: req.user._id 
    });

    if (!vendorProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado",
        code: "VENDOR_PROFILE_NOT_FOUND"
      });
    }

    const product = vendorProfile.products.id(productId);

    if (!product) {
      return res.status(404).json({ 
        message: "Produto não encontrado ou você não tem permissão",
        code: "PRODUCT_NOT_FOUND"
      });
    }

    req.vendorProfile = vendorProfile;
    req.product = product;
    next();

  } catch (error) {
    console.log("Erro no middleware isProductOwner:", error);
    return res.status(500).json({ 
      message: "Erro ao verificar propriedade do produto",
      error: error.message
    });
  }
};

/**
 * Verifica se é o próprio usuário ou admin
 */
export const isSelfOrAdmin = (req, res, next) => {
  const targetUserId = req.params.userId || req.params.id;

  const isSelf = req.user._id.toString() === targetUserId;
  const isAdminUser = req.user.role.includes("admin");

  if (isSelf || isAdminUser) {
    return next();
  }

  return res.status(403).json({
    message: "Você só pode acessar seus próprios dados",
    code: "FORBIDDEN"
  });
};

// VERIFICAÇÕES COMBINADAS

/**
 * Verifica se usuário tem qualquer uma das roles especificadas
 * 
 * @param {...String} roles - Roles permitidas
 * @returns {Function} Middleware
 */
export const hasAnyRole = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user.role;
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        message: `Acesso negado - Requer uma das roles: ${roles.join(", ")}`,
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: roles,
        userRoles: userRoles
      });
    }

    next();
  };
};

/**
 * Verifica se usuário tem todas as roles especificadas
 * 
 * @param {...String} roles - Roles necessárias
 * @returns {Function} Middleware
 */
export const hasAllRoles = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user.role;
    const hasAllRoles = roles.every(role => userRoles.includes(role));

    if (!hasAllRoles) {
      return res.status(403).json({
        message: `Acesso negado - Requer todas as roles: ${roles.join(", ")}`,
        code: "INSUFFICIENT_PERMISSIONS",
        requiredRoles: roles,
        userRoles: userRoles
      });
    }

    next();
  };
};

// RATE LIMITING (Opcional)

const requestCounts = new Map();

/**
 * Rate limiter simples em memória
 * ATENÇÃO: Use Redis em produção!
 * 
 * @param {Number} maxRequests - Número máximo de requisições
 * @param {Number} windowMs - Janela de tempo em milissegundos
 * @returns {Function} Middleware
 */
export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    try {
      const userId = req.user?._id?.toString() || req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Limpar registros antigos
      if (requestCounts.has(userId)) {
        const userRequests = requestCounts.get(userId);
        const recentRequests = userRequests.filter(time => time > windowStart);
        requestCounts.set(userId, recentRequests);
      } else {
        requestCounts.set(userId, []);
      }

      const userRequests = requestCounts.get(userId);

      if (userRequests.length >= maxRequests) {
        return res.status(429).json({
          message: "Muitas requisições. Tente novamente mais tarde.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
        });
      }

      userRequests.push(now);
      next();

    } catch (error) {
      console.log("Erro no rate limiter:", error);
      next(); // Em caso de erro, permitir a requisição
    }
  };
};

// AUDIT LOG (Opcional)

/**
 * Registra ações importantes para auditoria
 * 
 * @param {String} action - Nome da ação
 * @returns {Function} Middleware
 */
export const auditLog = (action) => {
  return (req, res, next) => {
    try {
      const logData = {
        action,
        userId: req.user?._id,
        userEmail: req.user?.email,
        userRoles: req.user?.role,
        ip: req.ip,
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString(),
      };

      // Em produção, salve no banco ou envie para serviço de log
      console.log("🔍 AUDIT LOG:", JSON.stringify(logData, null, 2));

      next();
    } catch (error) {
      console.log("Erro no audit log:", error);
      next(); // Não bloquear requisição por erro no log
    }
  };
};