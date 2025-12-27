import jwt from "jsonwebtoken";
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

// Middleware para verificar se usuário é admin
export const protectAdminRoute = (req, res, next) => {
  try {
    const token = req.cookies.adminAccessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Token não fornecido."
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET || "admin_secret_key_2024");
    
    // Verificar se o usuário ainda existe na lista
    const admin = authorizedAdmins.find(a => a.id === decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Acesso negado. Usuário não autorizado."
      });
    }

    // Adicionar dados do admin na requisição
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

// Middleware para verificar permissões específicas
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

// Middleware para rate limiting (proteção contra spam)
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

// Limpar rate limit a cada hora
setInterval(() => {
  requestCounts.clear();
}, 60 * 60 * 1000);