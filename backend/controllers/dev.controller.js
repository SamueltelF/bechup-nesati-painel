import User from "../models/user.model.js";
import AdminProfile from "../models/admin.model.js";

// Middleware para verificar senha de dev
export const verifyDevPassword = (req, res, next) => {
  const { devPassword } = req.body;
  
  const correctPassword = process.env.DEV_PASSWORD || "dev123senha"; // Configure no .env
  
  if (devPassword !== correctPassword) {
    return res.status(401).json({ message: "Senha de desenvolvedor inválida" });
  }
  
  next();
};

// Listar todos os usuários customers (não-vendedores)
export const listCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query = { role: "customer" };
    
    // Busca por nome ou email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const customers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await User.countDocuments(query);

    // Verificar quais já têm AdminProfile
    const customerIds = customers.map(c => c._id);
    const existingProfiles = await AdminProfile.find({ 
      userId: { $in: customerIds } 
    }).select("userId");
    
    const profileUserIds = existingProfiles.map(p => p.userId.toString());
    
    // Adicionar flag se já é vendedor pendente
    const customersWithStatus = customers.map(customer => ({
      ...customer,
      hasAdminProfile: profileUserIds.includes(customer._id.toString())
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
    res.status(500).json({ message: "Erro ao listar customers", error: error.message });
  }
};

// Listar todos os vendedores (com AdminProfile)
export const listSellers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let query = {};
    
    if (status) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } }
      ];
    }

    const sellers = await AdminProfile.find(query)
      .populate("userId", "name email phone createdAt")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await AdminProfile.countDocuments(query);

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
    res.status(500).json({ message: "Erro ao listar vendedores", error: error.message });
  }
};

// Promover customer para admin (vendedor)
export const promoteToSeller = async (req, res) => {
  try {
    const { userId } = req.params;
    const { storeName, storeDescription } = req.body;

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se já é admin
    if (user.role === "admin") {
      return res.status(400).json({ message: "Usuário já é vendedor" });
    }

    // Verificar se já tem AdminProfile
    const existingProfile = await AdminProfile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({ 
        message: "Usuário já possui perfil de vendedor",
        profile: existingProfile 
      });
    }

    // Atualizar role do User
    user.role = "admin";
    await user.save();

    // Criar AdminProfile inicial
    const adminProfile = await AdminProfile.create({
      userId: user._id,
      fullName: user.name, // Pega o nome do User
      storeName: storeName || `Loja de ${user.name}`,
      storeDescription: storeDescription || "Nova loja",
      // Outros campos ficam vazios, vendedor completa depois
      cpf: "", // Vendedor precisa preencher
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
      adminProfile: {
        _id: adminProfile._id,
        storeName: adminProfile.storeName,
        verificationStatus: adminProfile.verificationStatus,
      }
    });

  } catch (error) {
    console.log("Erro ao promover usuário:", error);
    res.status(500).json({ message: "Erro ao promover usuário", error: error.message });
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

    if (user.role !== "admin") {
      return res.status(400).json({ message: "Usuário não é vendedor" });
    }

    // Verificar se tem produtos ativos ou vendas pendentes
    const adminProfile = await AdminProfile.findOne({ userId });
    if (adminProfile) {
      const activeProducts = adminProfile.products.filter(p => p.isActive).length;
      if (activeProducts > 0) {
        return res.status(400).json({ 
          message: "Vendedor possui produtos ativos. Desative-os primeiro.",
          activeProducts 
        });
      }

      if (adminProfile.balance.total > 0) {
        return res.status(400).json({ 
          message: "Vendedor possui saldo pendente. Solicite saque primeiro.",
          balance: adminProfile.balance.total 
        });
      }

      // Desativar perfil
      adminProfile.isActive = false;
      await adminProfile.save();
    }

    // Rebaixar role
    user.role = "customer";
    await user.save();

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
    res.status(500).json({ message: "Erro ao rebaixar vendedor", error: error.message });
  }
};

// Deletar AdminProfile (cuidado - apenas para dev/testes)
export const deleteSellerProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const adminProfile = await AdminProfile.findOne({ userId });
    if (!adminProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    // Verificações de segurança
    if (adminProfile.balance.total > 0) {
      return res.status(400).json({ 
        message: "Não é possível deletar. Vendedor possui saldo.",
        balance: adminProfile.balance.total 
      });
    }

    if (adminProfile.salesHistory.length > 0) {
      return res.status(400).json({ 
        message: "Não é possível deletar. Vendedor possui histórico de vendas.",
        totalSales: adminProfile.salesHistory.length 
      });
    }

    await AdminProfile.findByIdAndDelete(adminProfile._id);

    // Rebaixar user para customer
    await User.findByIdAndUpdate(userId, { role: "customer" });

    res.json({ message: "Perfil de vendedor deletado com sucesso" });

  } catch (error) {
    console.log("Erro ao deletar perfil:", error);
    res.status(500).json({ message: "Erro ao deletar perfil", error: error.message });
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

    // Verificar se tem AdminProfile
    const adminProfile = await AdminProfile.findOne({ userId });

    res.json({
      user,
      adminProfile: adminProfile || null,
      isEligibleForPromotion: user.role === "customer" && !adminProfile
    });

  } catch (error) {
    console.log("Erro ao buscar detalhes:", error);
    res.status(500).json({ message: "Erro ao buscar detalhes", error: error.message });
  }
};

// Estatísticas gerais
export const getDevStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    
    const totalSellerProfiles = await AdminProfile.countDocuments();
    const approvedSellers = await AdminProfile.countDocuments({ verificationStatus: "approved" });
    const pendingSellers = await AdminProfile.countDocuments({ verificationStatus: "pending" });
    const rejectedSellers = await AdminProfile.countDocuments({ verificationStatus: "rejected" });

    // Vendedores com produtos
    const sellersWithProducts = await AdminProfile.countDocuments({
      "products.0": { $exists: true }
    });

    res.json({
      users: {
        total: totalUsers,
        customers: totalCustomers,
        admins: totalAdmins,
      },
      sellers: {
        total: totalSellerProfiles,
        approved: approvedSellers,
        pending: pendingSellers,
        rejected: rejectedSellers,
        withProducts: sellersWithProducts,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
};