import AdminProfile from "../models/admin.model.js";


// SALDO E BALANÇO

// Buscar saldo do vendedor
export const getBalance = async (req, res) => {
  try {
    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    res.json({
      balance: {
        available: adminProfile.balance.available,
        pending: adminProfile.balance.pending,
        total: adminProfile.balance.total,
      },
      totalEarnings: adminProfile.totalEarnings,
      totalWithdrawals: adminProfile.totalWithdrawals,
    });

  } catch (error) {
    console.log("Erro ao buscar saldo:", error);
    res.status(500).json({ 
      message: "Erro ao buscar saldo", 
      error: error.message 
    });
  }
};

// Buscar histórico de transações do saldo
export const getBalanceHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    let balanceHistory = adminProfile.balanceHistory;

    // Filtrar por tipo se fornecido
    if (type) {
      balanceHistory = balanceHistory.filter(t => t.type === type);
    }

    
    balanceHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedHistory = balanceHistory.slice(startIndex, endIndex);

    res.json({
      transactions: paginatedHistory,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(balanceHistory.length / limit),
        totalTransactions: balanceHistory.length,
        hasNextPage: endIndex < balanceHistory.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar histórico:", error);
    res.status(500).json({ 
      message: "Erro ao buscar histórico de transações", 
      error: error.message 
    });
  }
};


// HISTÓRICO DE VENDAS

// Buscar todas as vendas do vendedor
export const getMySales = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    let salesHistory = adminProfile.salesHistory;

    // Filtrar por status
    if (status) {
      salesHistory = salesHistory.filter(sale => sale.orderStatus === status);
    }

    // Filtrar por data
    if (startDate || endDate) {
      salesHistory = salesHistory.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        if (startDate && saleDate < new Date(startDate)) return false;
        if (endDate && saleDate > new Date(endDate)) return false;
        return true;
      });
    }

    
    salesHistory.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedSales = salesHistory.slice(startIndex, endIndex);

    res.json({
      sales: paginatedSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(salesHistory.length / limit),
        totalSales: salesHistory.length,
        hasNextPage: endIndex < salesHistory.length,
        hasPrevPage: page > 1,
      },
      summary: {
        totalSales: adminProfile.totalSales,
        totalEarnings: adminProfile.totalEarnings,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar vendas:", error);
    res.status(500).json({ 
      message: "Erro ao buscar histórico de vendas", 
      error: error.message 
    });
  }
};

// Buscar detalhes de uma venda específica
export const getSaleDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    const sale = adminProfile.salesHistory.find(
      s => s.orderId.toString() === orderId
    );

    if (!sale) {
      return res.status(404).json({ 
        message: "Venda não encontrada" 
      });
    }

    res.json({ sale });

  } catch (error) {
    console.log("Erro ao buscar detalhes da venda:", error);
    res.status(500).json({ 
      message: "Erro ao buscar detalhes da venda", 
      error: error.message 
    });
  }
};

// Atualizar código de rastreio
export const updateTrackingCode = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingCode } = req.body;

    if (!trackingCode) {
      return res.status(400).json({ 
        message: "Código de rastreio é obrigatório" 
      });
    }

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    const sale = adminProfile.salesHistory.find(
      s => s.orderId.toString() === orderId
    );

    if (!sale) {
      return res.status(404).json({ 
        message: "Venda não encontrada" 
      });
    }

    sale.trackingCode = trackingCode;
    sale.orderStatus = "shipped";
    await adminProfile.save();

    res.json({
      message: "Código de rastreio atualizado com sucesso",
      sale
    });

  } catch (error) {
    console.log("Erro ao atualizar código de rastreio:", error);
    res.status(500).json({ 
      message: "Erro ao atualizar código de rastreio", 
      error: error.message 
    });
  }
};

// SAQUES

// Solicitar saque
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        message: "Valor inválido para saque" 
      });
    }

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    if (adminProfile.verificationStatus !== "approved") {
      return res.status(403).json({ 
        message: "Seu perfil precisa estar aprovado para solicitar saques" 
      });
    }

    if (!adminProfile.bankDetails.pixKey && !adminProfile.bankDetails.accountNumber) {
      return res.status(400).json({ 
        message: "Configure seus dados bancários antes de solicitar saque" 
      });
    }

    if (amount > adminProfile.balance.available) {
      return res.status(400).json({ 
        message: "Saldo insuficiente para saque",
        available: adminProfile.balance.available
      });
    }

    const feePercentage = 0.02;
    const minFee = 2.00;
    const fee = Math.max(amount * feePercentage, minFee);

    await adminProfile.requestWithdrawal(amount, fee);

    res.json({
      message: "Solicitação de saque realizada com sucesso",
      withdrawal: {
        amount,
        fee,
        netAmount: amount - fee,
        status: "pending",
      },
      newBalance: {
        available: adminProfile.balance.available,
        pending: adminProfile.balance.pending,
        total: adminProfile.balance.total,
      }
    });

  } catch (error) {
    console.log("Erro ao solicitar saque:", error);
    res.status(500).json({ 
      message: error.message || "Erro ao solicitar saque", 
      error: error.message 
    });
  }
};

// Buscar histórico de saques
export const getWithdrawalHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    let withdrawalHistory = adminProfile.withdrawalHistory;

    // Filtrar por status
    if (status) {
      withdrawalHistory = withdrawalHistory.filter(w => w.status === status);
    }

    withdrawalHistory.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedWithdrawals = withdrawalHistory.slice(startIndex, endIndex);

    res.json({
      withdrawals: paginatedWithdrawals,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(withdrawalHistory.length / limit),
        totalWithdrawals: withdrawalHistory.length,
        hasNextPage: endIndex < withdrawalHistory.length,
        hasPrevPage: page > 1,
      },
      summary: {
        totalWithdrawn: adminProfile.totalWithdrawals,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar histórico de saques:", error);
    res.status(500).json({ 
      message: "Erro ao buscar histórico de saques", 
      error: error.message 
    });
  }
};

// ESTATÍSTICAS E RELATÓRIOS

// Dashboard com estatísticas gerais
export const getDashboard = async (req, res) => {
  try {
    const adminProfile = await AdminProfile.findOne({ userId: req.user._id });

    if (!adminProfile) {
      return res.status(404).json({ 
        message: "Perfil de vendedor não encontrado" 
      });
    }

    // Vendas dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = adminProfile.salesHistory.filter(
      sale => new Date(sale.saleDate) >= thirtyDaysAgo
    );

    const salesLast30Days = recentSales.length;
    const earningsLast30Days = recentSales.reduce(
      (sum, sale) => sum + sale.netAmount, 0
    );

    // Vendas por status
    const salesByStatus = {};
    adminProfile.salesHistory.forEach(sale => {
      salesByStatus[sale.orderStatus] = (salesByStatus[sale.orderStatus] || 0) + 1;
    });

    res.json({
      balance: adminProfile.balance,
      statistics: {
        totalSales: adminProfile.totalSales,
        totalEarnings: adminProfile.totalEarnings,
        totalWithdrawals: adminProfile.totalWithdrawals,
        totalProducts: adminProfile.totalProducts,
        salesLast30Days,
        earningsLast30Days,
        rating: adminProfile.rating,
        totalReviews: adminProfile.totalReviews,
      },
      salesByStatus,
      storeName: adminProfile.storeName,
      isActive: adminProfile.isActive,
    });

  } catch (error) {
    console.log("Erro ao buscar dashboard:", error);
    res.status(500).json({ 
      message: "Erro ao buscar dashboard", 
      error: error.message 
    });
  }
};