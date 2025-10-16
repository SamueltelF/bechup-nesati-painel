import AdminProfile from "../models/admin.model.js";

/**
 * Verifica se o usuário tem role de admin
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next()
  } else {
    return res.status(403).json({message: "Acesso negado. Apenas vendedores podem acessar."});
  }
}

/**
 * Verifica se o usuário é admin E está verificado/aprovado
 */
export const isVerifiedAdmin = async (req, res, next) => {
  try {
    // Primeiro verifica se é admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({message: "Acesso negado. Apenas vendedores podem acessar."})
    }

    // Buscar perfil de admin
    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(403).json({message: "Perfil de vendedor não encontrado. Crie seu perfil primeiro."})
    }

    // Verificar status de aprovação
    if (adminProfile.verificationStatus !== "approved") {
      return res.status(403).json({message: "Seu perfil de vendedor ainda não foi aprovado", verificationStatus: adminProfile.verificationStatus,
        rejectionReason: adminProfile.rejectionReason})
    }

    // Verificar se conta está ativa
    if (!adminProfile.isActive) {
      return res.status(403).json({message: "Sua conta de vendedor está inativa. Entre em contato com o suporte." })
    }

    // Adicionar adminProfile no request para uso posterior
    req.adminProfile = adminProfile
    next()

  } catch (error) {
    console.log("Erro no middleware isVerifiedAdmin:", error);
    res.status(500).json({message: "Erro ao verificar permissões", error: error.message})
  }
}

/**
 * Verifica se é um super admin (admin que aprova outros vendedores)
 */
export const isSuperAdmin = (req, res, next) => {
  // Verificar se é admin primeiro
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({message: "Acesso negado. Apenas administradores." })
  }

  // Opção 1: Verificar por campo no banco (recomendado para produção)
  // if (!req.user.isSuperAdmin) {
  //   return res.status(403).json({ 
  //     message: "Acesso negado. Apenas super administradores." 
  //   });
  // }

  // Opção 2: Lista hardcoded de super admins (para desenvolvimento/inicial)
  const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || []
  
  if (SUPER_ADMIN_IDS.length === 0) {
    // Se não houver super admins configurados, negar acesso
    return res.status(403).json({message: "Sistema de super administradores não configurado."})
  }

  if (!SUPER_ADMIN_IDS.includes(req.user._id.toString())) {
    return res.status(403).json({message: "Acesso negado. Apenas super administradores podem aprovar vendedores." })
  }

  next()
}

/**
 * Verifica se usuário pode gerenciar um recurso
 * (é o dono OU é super admin)
 */
export const canManageResource = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      // Obter o userId do recurso (pode ser uma função ou valor direto)
      const resourceUserId = typeof getResourceUserId === 'function' 
        ? await getResourceUserId(req) 
        : getResourceUserId

      // Verificar se é o dono
      const isOwner = req.user._id.toString() === resourceUserId.toString()

      if (isOwner) {
        return next()
      }

      // Verificar se é super admin
      const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(",") || []
      const isSuperAdmin = SUPER_ADMIN_IDS.includes(req.user._id.toString())

      if (isSuperAdmin) {
        return next()
      }

      // Nem dono nem super admin
      return res.status(403).json({message: "Você não tem permissão para gerenciar este recurso" })

    } catch (error) {
      console.log("Erro no middleware canManageResource:", error);
      res.status(500).json({message: "Erro ao verificar permissões", error: error.message })
    }
  }
}