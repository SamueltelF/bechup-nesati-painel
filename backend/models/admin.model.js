import mongoose from "mongoose"

const adminProfileSchema = new mongoose.Schema(
  {
    // Referência ao usuário principal
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Dados pessoais completos
    fullName: {
      type: String,
      required: [true, "Nome completo é obrigatório"],
      trim: true,
    },
    cpf: {
      type: String,
      required: [true, "CPF é obrigatório"],
      unique: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Data de nascimento é obrigatória"],
    },

    // Fotos de verificação
    personalPhoto: {
      type: String,
      default: null,
    },
    rgFrontPhoto: {
      type: String,
      default: null,
    },
    rgBackPhoto: {
      type: String,
      default: null,
    },

    // Dados adicionais
    address: {
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      complement: { type: String, trim: true },
      neighborhood: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
    },

    // Status de verificação
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    verificationDate: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },

    // Dados bancários
    bankDetails: {
      bankName: { type: String },
      accountType: { 
        type: String, 
        enum: ["corrente", "poupanca", ""] 
      },
      accountNumber: { type: String },
      agency: { type: String },
      pixKey: { type: String },
    },

    // Informações de vendedor/loja
    storeName: {
      type: String,
      trim: true,
      default: null,
    },
    storeDescription: {
      type: String,
      default: null,
    },
    
    // ============================================
    // PRODUTOS DO VENDEDOR
    // ============================================
    products: [
      {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
          maxLength: 2000,
        },
        price: {
          type: Number,
          min: 0,
          required: true,
        },
        image: {
          type: String,
          required: [true, "Imagem é obrigatória"],
        },
        category: {
          type: String,
          required: [true, "Categoria é obrigatória"],
        },
        produtoV: {
          type: String,
          required: [true, "Tipo de produto é obrigatório"],
        },
        isFeatured: {
          type: Boolean,
          default: false,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        stock: {
          type: Number,
          default: 0,
          min: 0,
        },
        sold: {
          type: Number,
          default: 0,
          min: 0,
        },
        views: {
          type: Number,
          default: 0,
          min: 0,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],
    
    // ============================================
    // DADOS FINANCEIROS DO VENDEDOR
    // ============================================
    
    balance: {
      available: {
        type: Number,
        default: 0,
        min: 0,
      },
      pending: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      }
    },

    balanceHistory: [
      {
        type: {
          type: String,
          enum: [
            "sale",
            "refund",
            "withdrawal",
            "withdrawal_fee",
            "platform_fee",
            "adjustment",
          ],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          default: null,
        },
        withdrawalId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Withdrawal",
          default: null,
        },
        balanceBefore: {
          type: Number,
          required: true,
        },
        balanceAfter: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["completed", "pending", "cancelled"],
          default: "completed",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      }
    ],

    salesHistory: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
          required: true,
        },
        buyerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        buyerName: {
          type: String,
          required: true,
        },
        buyerEmail: {
          type: String,
          required: true,
        },
        products: [
          {
            productId: {
              type: mongoose.Schema.Types.ObjectId,
              required: true,
            },
            productName: {
              type: String,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
            price: {
              type: Number,
              required: true,
            },
            total: {
              type: Number,
              required: true,
            },
          }
        ],
        subtotal: {
          type: Number,
          required: true,
        },
        platformFee: {
          type: Number,
          required: true,
          default: 0,
        },
        netAmount: {
          type: Number,
          required: true,
        },
        paymentMethod: {
          type: String,
          enum: ["credit_card", "debit_card", "pix", "boleto"],
        },
        orderStatus: {
          type: String,
          enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"],
          default: "pending",
        },
        shippingAddress: {
          street: String,
          number: String,
          complement: String,
          neighborhood: String,
          city: String,
          state: String,
          zipCode: String,
        },
        trackingCode: {
          type: String,
          default: null,
        },
        saleDate: {
          type: Date,
          default: Date.now,
        },
        deliveryDate: {
          type: Date,
          default: null,
        },
      }
    ],

    withdrawalHistory: [
      {
        amount: {
          type: Number,
          required: true,
        },
        fee: {
          type: Number,
          default: 0,
        },
        netAmount: {
          type: Number,
          required: true,
        },
        bankDetails: {
          bankName: String,
          accountType: String,
          accountNumber: String,
          agency: String,
          pixKey: String,
        },
        status: {
          type: String,
          enum: ["pending", "processing", "completed", "failed", "cancelled"],
          default: "pending",
        },
        requestDate: {
          type: Date,
          default: Date.now,
        },
        processedDate: {
          type: Date,
          default: null,
        },
        receipt: {
          type: String,
          default: null,
        },
        notes: {
          type: String,
          default: null,
        },
      }
    ],

    // Estatísticas
    totalSales: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    totalWithdrawals: {
      type: Number,
      default: 0,
    },
    totalProducts: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    // Status ativo/inativo
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
adminProfileSchema.index({ userId: 1 })
adminProfileSchema.index({ cpf: 1 })
adminProfileSchema.index({ verificationStatus: 1 })
adminProfileSchema.index({ "salesHistory.orderId": 1 })
adminProfileSchema.index({ "salesHistory.saleDate": -1 })
adminProfileSchema.index({ "products.name": "text", "products.category": "text" })
adminProfileSchema.index({ "products.isActive": 1 })

// Verificar se perfil está completo
adminProfileSchema.methods.isProfileComplete = function () {
  return !!(
    this.fullName &&
    this.cpf &&
    this.dateOfBirth &&
    this.personalPhoto &&
    this.rgFrontPhoto &&
    this.rgBackPhoto
  )
}

// Calcular idade
adminProfileSchema.methods.getAge = function () {
  if (!this.dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(this.dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Aprovar verificação
adminProfileSchema.methods.approve = async function () {
  this.verificationStatus = "approved"
  this.verificationDate = new Date()
  this.rejectionReason = null
  await this.save()
};

// Rejeitar verificação
adminProfileSchema.methods.reject = async function (reason) {
  this.verificationStatus = "rejected"
  this.verificationDate = new Date()
  this.rejectionReason = reason
  await this.save()
}

// Adicionar produto
adminProfileSchema.methods.addProduct = async function (productData) {
  this.products.push({
    ...productData,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  this.totalProducts = this.products.filter(p => p.isActive).length
  await this.save()
  return this.products[this.products.length - 1]
};

// Atualizar produto
adminProfileSchema.methods.updateProduct = async function (productId, updateData) {
  const product = this.products.id(productId)
  if (!product) throw new Error("Produto não encontrado")
  
  Object.assign(product, {
    ...updateData,
    updatedAt: new Date(),
  })
  await this.save()
  return product
}

// Deletar produto (soft delete)
adminProfileSchema.methods.deleteProduct = async function (productId) {
  const product = this.products.id(productId)
  if (!product) throw new Error("Produto não encontrado")
  
  product.isActive = false
  this.totalProducts = this.products.filter(p => p.isActive).length
  await this.save()
}

// Adicionar venda ao histórico
adminProfileSchema.methods.addSale = async function (saleData) {
  this.salesHistory.push(saleData)
  this.totalSales += 1
  this.totalEarnings += saleData.netAmount
  
  this.balance.pending += saleData.netAmount
  this.balance.total += saleData.netAmount
  
  this.balanceHistory.push({
    type: "sale",
    amount: saleData.netAmount,
    description: `Venda #${saleData.orderId}`,
    orderId: saleData.orderId,
    balanceBefore: this.balance.total - saleData.netAmount,
    balanceAfter: this.balance.total,
    status: "pending",
  })
  
  // Atualizar contagem de vendas do produto
  saleData.products.forEach(item => {
    const product = this.products.id(item.productId)
    if (product) {
      product.sold += item.quantity
      if (product.stock > 0) {
        product.stock -= item.quantity
      }
    }
  })
  
  await this.save()
}

// Liberar saldo
adminProfileSchema.methods.releaseBalance = async function (orderId, amount) {
  this.balance.pending -= amount
  this.balance.available += amount
  
  const transaction = this.balanceHistory.find(
    t => t.orderId?.toString() === orderId.toString() && t.type === "sale"
  )
  if (transaction) {
    transaction.status = "completed"
  }
  
  await this.save()
}

// Solicitar saque
adminProfileSchema.methods.requestWithdrawal = async function (amount, fee = 0) {
  if (amount > this.balance.available) {
    throw new Error("Saldo insuficiente")
  }
  
  const netAmount = amount - fee
  
  this.withdrawalHistory.push({
    amount,
    fee,
    netAmount,
    bankDetails: this.bankDetails,
    status: "pending",
  })
  
  this.balance.available -= amount
  this.balance.total -= amount
  
  this.balanceHistory.push({
    type: "withdrawal",
    amount: -amount,
    description: `Solicitação de saque`,
    balanceBefore: this.balance.total + amount,
    balanceAfter: this.balance.total,
    status: "pending",
  })
  
  if (fee > 0) {
    this.balanceHistory.push({
      type: "withdrawal_fee",
      amount: -fee,
      description: `Taxa de saque`,
      balanceBefore: this.balance.total,
      balanceAfter: this.balance.total,
      status: "completed",
    })
  }
  
  this.totalWithdrawals += netAmount
  await this.save()
};

// Cobrar taxa da plataforma
adminProfileSchema.methods.chargePlatformFee = async function (orderId, feeAmount) {
  this.balance.total -= feeAmount
  
  this.balanceHistory.push({
    type: "platform_fee",
    amount: -feeAmount,
    description: `Taxa da plataforma - Pedido #${orderId}`,
    orderId,
    balanceBefore: this.balance.total + feeAmount,
    balanceAfter: this.balance.total,
    status: "completed",
  })
  
  await this.save()
};

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema)

export default AdminProfile