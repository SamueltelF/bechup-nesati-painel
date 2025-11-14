import User from "../models/user.model.js";
import VendorProfile from "../models/admin.model.js";

// Middleware para verificar senha de dev
export const verifyDevPassword = (req, res, next) => {
  const devPassword = req.headers['x-dev-password'] || req.body.devPassword;
  
  const correctPassword = process.env.DEV_PASSWORD || "dev123senha";
  
  if (devPassword !== correctPassword) {
    return res.status(401).json({ message: "Senha de desenvolvedor inválida" });
  }
  
  next();
};

// Estatísticas gerais para o dashboard
export const getDevStats = async (req, res) => {
  try {
    // Total de usuários
    const totalUsers = await User.countDocuments();
    
    // Clientes (role: ["customer"])
    const totalCustomers = await User.countDocuments({ 
      role: { $size: 1, $all: ["customer"] } 
    });
    
    // Admins (tem role "vendor")
    const totalAdmins = await User.countDocuments({ 
      role: { $in: ["vendor"] } 
    });
    
    // Perfis de vendedores
    const totalSellerProfiles = await VendorProfile.countDocuments();
    const approvedSellers = await VendorProfile.countDocuments({ 
      verificationStatus: "approved" 
    });
    const pendingSellers = await VendorProfile.countDocuments({ 
      verificationStatus: "pending" 
    });
    const rejectedSellers = await VendorProfile.countDocuments({ 
      verificationStatus: "rejected" 
    });
    const underReviewSellers = await VendorProfile.countDocuments({ 
      verificationStatus: "under_review" 
    });

    // Vendedores com produtos
    const sellersWithProducts = await VendorProfile.countDocuments({
      "products.0": { $exists: true }
    });

    res.json({
      users: {
        total: totalUsers,
        customers: totalCustomers,
        vendors: totalAdmins,
      },
      sellers: {
        total: totalSellerProfiles,
        approved: approvedSellers,
        pending: pendingSellers,
        rejected: rejectedSellers,
        underReview: underReviewSellers,
        withProducts: sellersWithProducts,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar estatísticas:", error);
    res.status(500).json({ 
      message: "Erro ao buscar estatísticas", 
      error: error.message 
    });
  }
};

// Listar todos os usuários customers (não-vendedores)
export const listCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    // Buscar apenas customers (sem role vendor)
    let query = { 
      role: { $nin: ["vendor"] }
    };
    
    // Busca por nome ou email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const customers = await User.find(query)
      .select("-password -resetPasswordToken -emailVerificationCode -phoneVerificationCode")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    // Verificar quais já têm VendorProfile
    const customerIds = customers.map(c => c._id);
    const existingProfiles = await VendorProfile.find({ 
      userId: { $in: customerIds } 
    }).select("userId");
    
    const profileUserIds = existingProfiles.map(p => p.userId.toString());
    
    // Adicionar flag se já é vendedor pendente
    const customersWithStatus = customers.map(customer => ({
      ...customer,
      hasVendorProfile: profileUserIds.includes(customer._id.toString())
    }));

    res.json({
      customers: customersWithStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalCustomers: count,
        hasNextPage: page * limit < count,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao listar customers:", error);
    res.status(500).json({ 
      message: "Erro ao listar customers", 
      error: error.message 
    });
  }
};

// Listar todos os vendedores (com VendorProfile)
export const listSellers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let query = {};
    
    if (status) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } }
      ];
    }

    const sellers = await VendorProfile.find(query)
      .populate("userId", "name email phone createdAt isActive")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await VendorProfile.countDocuments(query);

    res.json({
      sellers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalSellers: count,
        hasNextPage: page * limit < count,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao listar vendedores:", error);
    res.status(500).json({ 
      message: "Erro ao listar vendedores", 
      error: error.message 
    });
  }
};

// Promover customer para vendor (vendedor)
export const promoteToSeller = async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName } = req.body;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se já é vendor
    if (user.role.includes("vendor")) {
      return res.status(400).json({ message: "Usuário já é vendedor" });
    }

    // Verificar se já tem VendorProfile
    const existingProfile = await VendorProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({ 
        message: "Usuário já possui perfil de vendedor",
        profile: existingProfile 
      });
    }

    // Adicionar role vendor ao User
    await user.addRole("vendor");

    // Criar VendorProfile inicial
    const vendorProfile = await VendorProfile.create({
      userId: user._id,
      fullName: user.name,
      displayName: displayName || user.name,
      cpf: "",
      dateOfBirth: null,
      verificationStatus: "pending",
      isActive: true,
    });

    res.json({
      message: "Usuário promovido a vendedor com sucesso",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      vendorProfile: {
        _id: vendorProfile._id,
        displayName: vendorProfile.displayName,
        verificationStatus: vendorProfile.verificationStatus,
      }
    });

  } catch (error) {
    console.log("Erro ao promover usuário:", error);
    res.status(500).json({ 
      message: "Erro ao promover usuário", 
      error: error.message 
    });
  }
};

// Rebaixar vendedor para customer
export const demoteToCustomer = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!user.role.includes("vendor")) {
      return res.status(400).json({ message: "Usuário não é vendedor" });
    }

    // Verificar se tem produtos ativos ou vendas pendentes
    const vendorProfile = await VendorProfile.findOne({ userId });
    if (vendorProfile) {
      const activeProducts = vendorProfile.products.filter(p => p.isActive).length;
      if (activeProducts > 0) {
        return res.status(400).json({ 
          message: "Vendedor possui produtos ativos. Desative-os primeiro.",
          activeProducts 
        });
      }

      if (vendorProfile.balance.total > 0) {
        return res.status(400).json({ 
          message: "Vendedor possui saldo pendente. Solicite saque primeiro.",
          balance: vendorProfile.balance.total 
        });
      }

      // Desativar perfil
      vendorProfile.isActive = false;
      await vendorProfile.save();
    }

    // Remover role vendor
    await user.removeRole("vendor");

    res.json({
      message: "Vendedor rebaixado para cliente com sucesso",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error) {
    console.log("Erro ao rebaixar vendedor:", error);
    res.status(500).json({ 
      message: "Erro ao rebaixar vendedor", 
      error: error.message 
    });
  }
};

// Deletar VendorProfile (cuidado - apenas para dev/testes)
export const deleteSellerProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const vendorProfile = await VendorProfile.findOne({ userId });
    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    // Verificações de segurança
    if (vendorProfile.balance.total > 0) {
      return res.status(400).json({ 
        message: "Não é possível deletar. Vendedor possui saldo.",
        balance: vendorProfile.balance.total 
      });
    }

    if (vendorProfile.salesHistory.length > 0) {
      return res.status(400).json({ 
        message: "Não é possível deletar. Vendedor possui histórico de vendas.",
        totalSales: vendorProfile.salesHistory.length 
      });
    }

    await VendorProfile.findByIdAndDelete(vendorProfile._id);

    // Remover role vendor do user
    const user = await User.findById(userId);
    if (user) {
      await user.removeRole("vendor");
    }

    res.json({ message: "Perfil de vendedor deletado com sucesso" });

  } catch (error) {
    console.log("Erro ao deletar perfil:", error);
    res.status(500).json({ 
      message: "Erro ao deletar perfil", 
      error: error.message 
    });
  }
};

// Ver detalhes de um customer específico
export const getCustomerDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se tem VendorProfile
    const vendorProfile = await VendorProfile.findOne({ userId });

    res.json({
      user,
      vendorProfile: vendorProfile || null,
      isEligibleForPromotion: !user.role.includes("vendor") && !vendorProfile
    });

  } catch (error) {
    console.log("Erro ao buscar detalhes:", error);
    res.status(500).json({ 
      message: "Erro ao buscar detalhes", 
      error: error.message 
    });
  }
};