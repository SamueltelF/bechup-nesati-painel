import VendorProfile from "../models/admin.model.js";
import User from "../models/user.model.js";


// VERIFICAÇÃO DE VENDEDORES


// Listar vendedores pendentes de aprovação
export const getPendingVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "pending" } = req.query;

    const query = {};
    if (status !== "all") {
      query.verificationStatus = status;
    }

    const totalVendors = await VendorProfile.countDocuments(query);

    const vendors = await VendorProfile.find(query)
      .populate("userId", "name email phone profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVendors / limit),
        totalVendors,
        hasNextPage: page * limit < totalVendors,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar vendedores:", error);
    res.status(500).json({ message: "Erro ao buscar vendedores", error: error.message });
  }
};

// Buscar detalhes de um vendedor específico
export const getVendorDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await VendorProfile.findById(vendorId)
      .populate("userId", "name email phone profilePicture createdAt");

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    res.json({ vendor });

  } catch (error) {
    console.log("Erro ao buscar vendedor:", error);
    res.status(500).json({ message: "Erro ao buscar vendedor", error: error.message });
  }
};

// Aprovar vendedor
export const approveVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    if (vendor.verificationStatus === "approved") {
      return res.status(400).json({ message: "Vendedor já está aprovado" });
    }

    await vendor.approve();

    res.json({ 
      message: "Vendedor aprovado com sucesso",
      vendor: {
        _id: vendor._id,
        fullName: vendor.fullName,
        displayName: vendor.displayName,
        verificationStatus: vendor.verificationStatus,
        verificationDate: vendor.verificationDate,
      }
    });

  } catch (error) {
    console.log("Erro ao aprovar vendedor:", error);
    res.status(500).json({ message: "Erro ao aprovar vendedor", error: error.message });
  }
};

// Rejeitar vendedor
export const rejectVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Motivo da rejeição é obrigatório" });
    }

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    await vendor.reject(reason);

    res.json({ 
      message: "Vendedor rejeitado com sucesso",
      vendor: {
        _id: vendor._id,
        fullName: vendor.fullName,
        verificationStatus: vendor.verificationStatus,
        rejectionReason: vendor.rejectionReason,
      }
    });

  } catch (error) {
    console.log("Erro ao rejeitar vendedor:", error);
    res.status(500).json({ message: "Erro ao rejeitar vendedor", error: error.message });
  }
};

// Desativar vendedor
export const deactivateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { reason } = req.body;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    vendor.isActive = false;
    vendor.rejectionReason = reason || "Conta desativada pela administração";
    await vendor.save();

    res.json({ 
      message: "Vendedor desativado com sucesso",
      vendor: {
        _id: vendor._id,
        fullName: vendor.fullName,
        isActive: vendor.isActive,
      }
    });

  } catch (error) {
    console.log("Erro ao desativar vendedor:", error);
    res.status(500).json({ message: "Erro ao desativar vendedor", error: error.message });
  }
};

// Reativar vendedor
export const reactivateVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    if (vendor.verificationStatus !== "approved") {
      return res.status(400).json({ 
        message: "Vendedor precisa estar aprovado para ser reativado" 
      });
    }

    vendor.isActive = true;
    vendor.rejectionReason = null;
    await vendor.save();

    res.json({ 
      message: "Vendedor reativado com sucesso",
      vendor: {
        _id: vendor._id,
        fullName: vendor.fullName,
        isActive: vendor.isActive,
      }
    });

  } catch (error) {
    console.log("Erro ao reativar vendedor:", error);
    res.status(500).json({ message: "Erro ao reativar vendedor", error: error.message });
  }
};


// ESTATÍSTICAS DA PLATAFORMA


// Dashboard de estatísticas gerais
export const getPlatformStats = async (req, res) => {
  try {
    const totalVendors = await VendorProfile.countDocuments();
    const approvedVendors = await VendorProfile.countDocuments({ verificationStatus: "approved" });
    const pendingVendors = await VendorProfile.countDocuments({ verificationStatus: "pending" });
    const rejectedVendors = await VendorProfile.countDocuments({ verificationStatus: "rejected" });
    const activeVendors = await VendorProfile.countDocuments({ isActive: true, verificationStatus: "approved" });

    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ emailVerified: true });

    // Calcular totais de produtos, vendas e ganhos
    const vendors = await VendorProfile.find({ verificationStatus: "approved" });
    
    let totalProducts = 0;
    let totalSales = 0;
    let totalEarnings = 0;
    let totalPlatformFees = 0;

    vendors.forEach(vendor => {
      totalProducts += vendor.totalProducts;
      totalSales += vendor.totalSales;
      totalEarnings += vendor.totalEarnings;
      
      // Calcular taxas da plataforma
      vendor.balanceHistory.forEach(transaction => {
        if (transaction.type === "platform_fee") {
          totalPlatformFees += Math.abs(transaction.amount);
        }
      });
    });

    res.json({
      stats: {
        vendors: {
          total: totalVendors,
          approved: approvedVendors,
          pending: pendingVendors,
          rejected: rejectedVendors,
          active: activeVendors,
        },
        users: {
          total: totalUsers,
          verified: verifiedUsers,
        },
        platform: {
          totalProducts,
          totalSales,
          totalEarnings,
          totalPlatformFees,
        }
      }
    });

  } catch (error) {
    console.log("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
};

// Buscar vendedores com filtros avançados
export const searchVendors = async (req, res) => {
  try {
    const { 
      search, 
      status, 
      isActive, 
      minSales, 
      maxSales,
      sortBy = "createdAt",
      order = "desc",
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Filtro por status
    if (status && status !== "all") {
      query.verificationStatus = status;
    }

    // Filtro por ativo/inativo
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Filtro por vendas
    if (minSales) {
      query.totalSales = { $gte: parseInt(minSales) };
    }
    if (maxSales) {
      query.totalSales = { ...query.totalSales, $lte: parseInt(maxSales) };
    }

    // Busca por nome, CPF, email
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { displayName: searchRegex },
        { cpf: searchRegex },
      ];
    }

    const totalVendors = await VendorProfile.countDocuments(query);

    const sortOrder = order === "desc" ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const vendors = await VendorProfile.find(query)
      .populate("userId", "name email phone")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVendors / limit),
        totalVendors,
        hasNextPage: page * limit < totalVendors,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar vendedores:", error);
    res.status(500).json({ message: "Erro ao buscar vendedores", error: error.message });
  }
};


// GERENCIAMENTO DE PRODUTOS (ADMIN)


// Listar todos os produtos da plataforma
export const getAllProductsAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      produtoV, 
      isActive,
      search 
    } = req.query;

    const vendors = await VendorProfile.find({ verificationStatus: "approved" });

    let allProducts = [];

    vendors.forEach(vendor => {
      const products = vendor.products.map(p => ({
        ...p.toObject(),
        vendorId: vendor._id,
        vendorName: vendor.displayName,
        vendorUserId: vendor.userId,
      }));
      allProducts = allProducts.concat(products);
    });

    // Filtros
    if (category) {
      allProducts = allProducts.filter(p => p.category === category);
    }

    if (produtoV) {
      allProducts = allProducts.filter(p => p.produtoV === produtoV);
    }

    if (isActive !== undefined) {
      allProducts = allProducts.filter(p => p.isActive === (isActive === "true"));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por data
    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allProducts.length / limit),
        totalProducts: allProducts.length,
        hasNextPage: endIndex < allProducts.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar produtos:", error);
    res.status(500).json({ message: "Erro ao buscar produtos", error: error.message });
  }
};

// Desativar produto (ADMIN)
export const deactivateProduct = async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    const { reason } = req.body;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    const product = vendor.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    product.isActive = false;
    vendor.totalProducts = vendor.products.filter(p => p.isActive).length;
    await vendor.save();

    res.json({ 
      message: "Produto desativado com sucesso",
      reason: reason || "Desativado pela administração"
    });

  } catch (error) {
    console.log("Erro ao desativar produto:", error);
    res.status(500).json({ message: "Erro ao desativar produto", error: error.message });
  }
};

// Reativar produto (ADMIN)
export const reactivateProduct = async (req, res) => {
  try {
    const { vendorId, productId } = req.params;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    const product = vendor.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    product.isActive = true;
    vendor.totalProducts = vendor.products.filter(p => p.isActive).length;
    await vendor.save();

    res.json({ message: "Produto reativado com sucesso" });

  } catch (error) {
    console.log("Erro ao reativar produto:", error);
    res.status(500).json({ message: "Erro ao reativar produto", error: error.message });
  }
};


// GERENCIAMENTO FINANCEIRO (ADMIN)

// Listar saques pendentes
export const getPendingWithdrawals = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "pending" } = req.query;

    const vendors = await VendorProfile.find()
      .populate("userId", "name email phone");

    let allWithdrawals = [];

    vendors.forEach(vendor => {
      vendor.withdrawalHistory.forEach(withdrawal => {
        if (status === "all" || withdrawal.status === status) {
          allWithdrawals.push({
            ...withdrawal.toObject(),
            vendorId: vendor._id,
            vendorName: vendor.displayName,
            vendorEmail: vendor.userId?.email,
          });
        }
      });
    });

    // Ordenar por data
    allWithdrawals.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedWithdrawals = allWithdrawals.slice(startIndex, endIndex);

    res.json({
      withdrawals: paginatedWithdrawals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allWithdrawals.length / limit),
        totalWithdrawals: allWithdrawals.length,
        hasNextPage: endIndex < allWithdrawals.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar saques:", error);
    res.status(500).json({ message: "Erro ao buscar saques", error: error.message });
  }
};

// Aprovar saque
export const approveWithdrawal = async (req, res) => {
  try {
    const { vendorId, withdrawalId } = req.params;
    const { receipt } = req.body;

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    const withdrawal = vendor.withdrawalHistory.id(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ message: "Saque não encontrado" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Saque já foi processado" });
    }

    withdrawal.status = "completed";
    withdrawal.processedDate = new Date();
    withdrawal.receipt = receipt || null;

    // Atualizar histórico de saldo
    const balanceTransaction = vendor.balanceHistory.find(
      t => t.type === "withdrawal" && t.status === "pending"
    );
    if (balanceTransaction) {
      balanceTransaction.status = "completed";
    }

    await vendor.save();

    res.json({ 
      message: "Saque aprovado com sucesso",
      withdrawal 
    });

  } catch (error) {
    console.log("Erro ao aprovar saque:", error);
    res.status(500).json({ message: "Erro ao aprovar saque", error: error.message });
  }
};

// Rejeitar saque
export const rejectWithdrawal = async (req, res) => {
  try {
    const { vendorId, withdrawalId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: "Motivo é obrigatório" });
    }

    const vendor = await VendorProfile.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    const withdrawal = vendor.withdrawalHistory.id(withdrawalId);

    if (!withdrawal) {
      return res.status(404).json({ message: "Saque não encontrado" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Saque já foi processado" });
    }

    // Devolver saldo ao vendedor
    vendor.balance.available += withdrawal.amount;
    vendor.balance.total += withdrawal.amount;

    withdrawal.status = "failed";
    withdrawal.processedDate = new Date();
    withdrawal.notes = reason;

    // Cancelar transação no histórico
    const balanceTransaction = vendor.balanceHistory.find(
      t => t.type === "withdrawal" && t.status === "pending"
    );
    if (balanceTransaction) {
      balanceTransaction.status = "cancelled";
    }

    await vendor.save();

    res.json({ 
      message: "Saque rejeitado e saldo devolvido",
      withdrawal 
    });

  } catch (error) {
    console.log("Erro ao rejeitar saque:", error);
    res.status(500).json({ message: "Erro ao rejeitar saque", error: error.message });
  }
};