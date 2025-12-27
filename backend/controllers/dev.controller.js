import User from "../models/user.model.js";
import VendorProfile from "../models/admin.model.js";
import Product from "../models/product.model.js";
import jwt from "jsonwebtoken";


// AUTENTICAÇÃO - ARRAY TEMPORÁRIO


// Array de administradores (temporário - substituir por banco depois)
const adminUsers = [
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

// Gerar token JWT para admin
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { adminId },
    process.env.ADMIN_JWT_SECRET || "admin_secret_key_2024",
    { expiresIn: "7d" }
  );
};

// Login do painel administrativo
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Usuário e senha são obrigatórios" 
      });
    }

    // Buscar usuário no array
    const admin = adminUsers.find(
      u => u.username === username && u.password === password
    );

    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: "Credenciais inválidas" 
      });
    }

    // Gerar token JWT
    const token = generateAdminToken(admin.id);

    // Enviar token como cookie
    res.cookie("adminAccessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    
    const { password: _, ...adminData } = admin;

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      admin: adminData,
      token
    });

  } catch (error) {
    console.log("Erro no login admin:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao fazer login", 
      error: error.message 
    });
  }
};

// Logout do painel
export const adminLogout = async (req, res) => {
  try {
    res.clearCookie("adminAccessToken");
    res.json({
      success: true,
      message: "Logout realizado com sucesso"
    });
  } catch (error) {
    console.log("Erro no logout admin:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao fazer logout", 
      error: error.message 
    });
  }
};

// Verificar sessão
export const checkAdminSession = async (req, res) => {
  try {
    if (req.admin) {
      return res.json({
        success: true,
        isAuthenticated: true,
        admin: req.admin
      });
    }

    res.status(401).json({ 
      success: false,
      isAuthenticated: false,
      message: "Não autenticado"
    });
  } catch (error) {
    res.status(401).json({ 
      success: false,
      isAuthenticated: false 
    });
  }
};


// DASHBOARD - ESTATÍSTICAS GERAIS


export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });
    const usersWithPhone = await User.countDocuments({ phone: { $ne: null } });

    const totalVendors = await VendorProfile.countDocuments();
    const approvedVendors = await VendorProfile.countDocuments({ verificationStatus: "approved" });
    const pendingVendors = await VendorProfile.countDocuments({ verificationStatus: "pending" });
    const activeVendors = await VendorProfile.countDocuments({ isActive: true, verificationStatus: "approved" });

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });

    const vendors = await VendorProfile.find({ verificationStatus: "approved" });
    
    let totalSales = 0;
    let totalEarnings = 0;
    let totalPlatformFees = 0;

    vendors.forEach(vendor => {
      totalSales += vendor.totalSales || 0;
      totalEarnings += vendor.totalEarnings || 0;
      
      vendor.balanceHistory.forEach(transaction => {
        if (transaction.type === "platform_fee") {
          totalPlatformFees += Math.abs(transaction.amount);
        }
      });
    });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          withPhone: usersWithPhone,
          growthRate: "+12%"
        },
        vendors: {
          total: totalVendors,
          approved: approvedVendors,
          pending: pendingVendors,
          active: activeVendors,
          growthRate: "+8%"
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          featured: featuredProducts,
          growthRate: "+15%"
        },
        financial: {
          totalSales,
          totalEarnings,
          platformFees: totalPlatformFees,
          monthlyRevenue: "R$ 45K",
          growthRate: "+23%"
        }
      }
    });

  } catch (error) {
    console.log("Erro ao buscar estatísticas:", error);
    res.status(500).json({ 
      success: false,
      message: "Erro ao buscar estatísticas", 
      error: error.message 
    });
  }
};


// PESQUISAS
// ============================================

export const searchUsers = async (req, res) => {
  try {
    const { search, emailVerified, phoneVerified, role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (emailVerified !== undefined) query.emailVerified = emailVerified === "true";
    if (phoneVerified !== undefined) query.phoneVerified = phoneVerified === "true";
    if (role) query.role = role;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query).select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNextPage: page * limit < totalUsers,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao pesquisar usuários", error: error.message });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { search, category, produtoV, isActive, isFeatured, minPrice, maxPrice, page = 1, limit = 20 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (produtoV) query.produtoV = produtoV;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
    if (minPrice) query.price = { $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({
      success: true,
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        hasNextPage: page * limit < totalProducts,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao pesquisar produtos", error: error.message });
  }
};

export const searchVendors = async (req, res) => {
  try {
    const { search, status, isActive, minSales, maxSales, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "all") query.verificationStatus = status;
    if (isActive !== undefined) query.isActive = isActive === "true";
    if (minSales) query.totalSales = { $gte: parseInt(minSales) };
    if (maxSales) query.totalSales = { ...query.totalSales, $lte: parseInt(maxSales) };
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [{ fullName: searchRegex }, { displayName: searchRegex }, { cpf: searchRegex }];
    }

    const totalVendors = await VendorProfile.countDocuments(query);
    const vendors = await VendorProfile.find(query).populate("userId", "name email phone profilePicture").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

    res.json({
      success: true,
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVendors / limit),
        totalVendors,
        hasNextPage: page * limit < totalVendors,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao pesquisar vendedores", error: error.message });
  }
};

export const searchPayments = async (req, res) => {
  try {
    const { status = "all", vendorId, minAmount, maxAmount, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (vendorId) query._id = vendorId;

    const vendors = await VendorProfile.find(query).populate("userId", "name email phone");
    let allWithdrawals = [];

    vendors.forEach(vendor => {
      vendor.withdrawalHistory.forEach(withdrawal => {
        if (status === "all" || withdrawal.status === status) {
          let includeWithdrawal = true;
          if (minAmount && withdrawal.amount < parseFloat(minAmount)) includeWithdrawal = false;
          if (maxAmount && withdrawal.amount > parseFloat(maxAmount)) includeWithdrawal = false;

          if (includeWithdrawal) {
            allWithdrawals.push({
              ...withdrawal.toObject(),
              withdrawalId: withdrawal._id,
              vendorId: vendor._id,
              vendorName: vendor.displayName,
              vendorEmail: vendor.userId?.email,
              vendorPhone: vendor.userId?.phone
            });
          }
        }
      });
    });

    allWithdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedWithdrawals = allWithdrawals.slice(startIndex, endIndex);

    res.json({
      success: true,
      withdrawals: paginatedWithdrawals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allWithdrawals.length / limit),
        totalWithdrawals: allWithdrawals.length,
        hasNextPage: endIndex < allWithdrawals.length,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao pesquisar pagamentos", error: error.message });
  }
};


// RELATÓRIOS
export const getProductsReport = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const inactiveProducts = await Product.countDocuments({ isActive: false });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });

    const productsByCategory = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const productsByType = await Product.aggregate([
      { $group: { _id: "$produtoV", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      report: {
        summary: { total: totalProducts, active: activeProducts, inactive: inactiveProducts, featured: featuredProducts },
        byCategory: productsByCategory,
        byType: productsByType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao gerar relatório", error: error.message });
  }
};

export const getGeneralReport = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedEmailUsers = await User.countDocuments({ emailVerified: true });
    const verifiedPhoneUsers = await User.countDocuments({ phoneVerified: true });

    const totalVendors = await VendorProfile.countDocuments();
    const approvedVendors = await VendorProfile.countDocuments({ verificationStatus: "approved" });
    const activeVendors = await VendorProfile.countDocuments({ isActive: true });

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });

    const vendors = await VendorProfile.find({ verificationStatus: "approved" });
    
    let totalBalance = 0, totalEarnings = 0, pendingWithdrawals = 0;

    vendors.forEach(vendor => {
      totalBalance += vendor.balance.total || 0;
      totalEarnings += vendor.totalEarnings || 0;
      vendor.withdrawalHistory.forEach(w => {
        if (w.status === "pending") pendingWithdrawals += w.amount;
      });
    });

    res.json({
      success: true,
      report: {
        users: {
          total: totalUsers,
          emailVerified: verifiedEmailUsers,
          phoneVerified: verifiedPhoneUsers,
          verificationRate: ((verifiedEmailUsers / totalUsers) * 100).toFixed(1) + "%"
        },
        vendors: {
          total: totalVendors,
          approved: approvedVendors,
          active: activeVendors,
          approvalRate: ((approvedVendors / totalVendors) * 100).toFixed(1) + "%"
        },
        products: {
          total: totalProducts,
          active: activeProducts,
          activeRate: ((activeProducts / totalProducts) * 100).toFixed(1) + "%"
        },
        financial: { totalBalance, totalEarnings, pendingWithdrawals, currency: "BRL" }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao gerar relatório", error: error.message });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentUsers = await User.find().select("name email createdAt").sort({ createdAt: -1 }).limit(5);
    const recentProducts = await Product.find().select("name category createdAt").sort({ createdAt: -1 }).limit(5);
    const recentVendors = await VendorProfile.find().populate("userId", "name email").select("displayName verificationStatus createdAt").sort({ createdAt: -1 }).limit(5);

    const activities = [];

    recentUsers.forEach(user => activities.push({ type: "user", user: user.name, action: "criou uma conta", time: user.createdAt, icon: "👤" }));
    recentProducts.forEach(product => activities.push({ type: "product", user: "Sistema", action: `adicionou produto "${product.name}"`, time: product.createdAt, icon: "📦" }));
    recentVendors.forEach(vendor => activities.push({ type: "vendor", user: vendor.userId?.name || vendor.displayName, action: "solicitou cadastro como vendedor", time: vendor.createdAt, icon: "🤝" }));

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({ success: true, activities: limitedActivities });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erro ao buscar atividades", error: error.message });
  }
};