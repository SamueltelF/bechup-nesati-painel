import jwt from "jsonwebtoken";
import AdminProfile from "../models/admin.model.js";


// AUTENTICAÇÃO PAINEL DEV (Array temporário)

const authorizedAdmins = [
  {
    id: 1,
    username: "admin",
    password: "admin123",
    name: "Administrador Principal",
    role: "super_admin"
  },
  {
    id: 2,
    username: "dev",
    password: "dev123",
    name: "Desenvolvedor",
    role: "admin"
  }
];

// Middleware para proteger rotas do painel dev
export const protectAdminRoute = (req, res, next) => {
  try {
    const token = req.cookies.adminAccessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Token não fornecido."
      });
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || "admin_secret_key_2024");
    const admin = authorizedAdmins.find(a => a.id === decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Usuário não autorizado."
      });
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role
    };

    next();
  } catch (error) {
    console.log("Erro na autenticação admin:", error);
    return res.status(401).json({
      success: false,
      message: "Token inválido ou expirado"
    });
  }
};

// Middleware para verificar role específica
export const checkAdminRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Autenticação necessária"
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: "Você não tem permissão para acessar este recurso"
      });
    }

    next();
  };
};

// Rate limiting
const requestCounts = new Map();

export const rateLimitAdmin = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const identifier = req.admin?.id || req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userData = requestCounts.get(identifier);

    if (now > userData.resetTime) {
      requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Muitas requisições. Tente novamente mais tarde."
      });
    }

    userData.count++;
    next();
  };
};

setInterval(() => {
  requestCounts.clear();
}, 60 * 60 * 1000);


// MIDDLEWARES PARA VENDEDORES (Sistema Principal)


/**
 * Verifica se o usuário tem role de admin (vendedor)
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      message: "Acesso negado. Apenas vendedores podem acessar."
    });
  }
};

/**
 * Verifica se o vendedor está verificado e aprovado
 */
export const isVerifiedVendor = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Acesso negado. Apenas vendedores podem acessar."
      });
    }

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(403).json({
        message: "Perfil de vendedor não encontrado. Crie seu perfil primeiro."
      });
    }

    if (adminProfile.verificationStatus !== "approved") {
      return res.status(403).json({
        message: "Seu perfil de vendedor ainda não foi aprovado",
        verificationStatus: adminProfile.verificationStatus,
        rejectionReason: adminProfile.rejectionReason
      });
    }

    if (!adminProfile.isActive) {
      return res.status(403).json({
        message: "Sua conta de vendedor está inativa. Entre em contato com o suporte."
      });
    }

    req.adminProfile = adminProfile;
    next();
  } catch (error) {
    console.log("Erro no middleware isVerifiedAdmin:", error);
    res.status(500).json({
      message: "Erro ao verificar permissões",
      error: error.message
    });
  }
};

/**
 * Verifica se é um super admin (aprova vendedores)
 */
export const isSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Acesso negado. Apenas administradores."
    });
  }

  const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || [];
  
  if (SUPER_ADMIN_IDS.length === 0) {
    return res.status(403).json({
      message: "Sistema de super administradores não configurado."
    });
  }

  if (!SUPER_ADMIN_IDS.includes(req.user._id.toString())) {
    return res.status(403).json({
      message: "Acesso negado. Apenas super administradores podem aprovar vendedores."
    });
  }

  next();
};

/**
 * Verifica se pode gerenciar recurso (dono ou super admin)
 */
export const canManageResource = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      const resourceUserId = typeof getResourceUserId === 'function' 
        ? await getResourceUserId(req) 
        : getResourceUserId;

      const isOwner = req.user._id.toString() === resourceUserId.toString();
      
      if (isOwner) {
        return next();
      }

      const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || [];
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(req.user._id.toString());
      
      if (isSuperAdmin) {
        return next();
      }

      return res.status(403).json({
        message: "Você não tem permissão para gerenciar este recurso"
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


export const protectDevPanel = protectAdminRoute;
export const checkDevPanelRole = checkAdminRole;
export const rateLimitDevPanel = rateLimitAdmin;