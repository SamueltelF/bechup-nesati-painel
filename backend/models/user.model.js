import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Nome é obrigatório"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Senha é obrigatória"],
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    
    // ============================================
    // SISTEMA DE ROLES
    // ============================================
    role: {
      type: [String],
      enum: ["customer", "vendor", "admin"],
      default: ["customer"],
    },
    
    // ============================================
    // VERIFICAÇÕES
    // ============================================
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    
    // Código de verificação de email
    emailVerificationCode: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    
    // Código de verificação de telefone
    phoneVerificationCode: {
      type: String,
      default: null,
    },
    phoneVerificationExpires: {
      type: Date,
      default: null,
    },
    
    // Reset de senha
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    
    // ============================================
    // STATUS DA CONTA
    // ============================================
    isActive: {
      type: Boolean,
      default: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: null,
    },
    
    // ============================================
    // ENDEREÇOS (PARA COMPRAS)
    // ============================================
    addresses: [
      {
        label: {
          type: String,
          default: "Casa",
        },
        street: { type: String },
        number: { type: String },
        complement: { type: String },
        neighborhood: { type: String },
        city: { type: String },
        state: { type: String },
        zipCode: { type: String },
        isDefault: {
          type: Boolean,
          default: false,
        },
      }
    ],
    
    // ============================================
    // PREFERÊNCIAS
    // ============================================
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      language: {
        type: String,
        default: "pt-BR",
      },
      currency: {
        type: String,
        default: "BRL",
      },
    },
    
    // ============================================
    // HISTÓRICO DE LOGIN
    // ============================================
    lastLogin: {
      type: Date,
      default: null,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// ÍNDICES
// ============================================
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Criptografar senha antes de salvar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// MÉTODOS DE INSTÂNCIA
// ============================================

// Comparar senha
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Verificar se é vendedor
userSchema.methods.isVendor = function () {
  return this.role.includes("vendor");
};

// Verificar se é admin
userSchema.methods.isAdmin = function () {
  return this.role.includes("admin");
};

// Verificar se é apenas cliente
userSchema.methods.isCustomerOnly = function () {
  return this.role.length === 1 && this.role.includes("customer");
};

// Adicionar role
userSchema.methods.addRole = async function (newRole) {
  if (!this.role.includes(newRole)) {
    this.role.push(newRole);
    await this.save();
  }
};

// Remover role
userSchema.methods.removeRole = async function (roleToRemove) {
  this.role = this.role.filter(r => r !== roleToRemove);
  if (this.role.length === 0) {
    this.role = ["customer"]; // Sempre manter pelo menos customer
  }
  await this.save();
};

// Verificar se conta está bloqueada
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Incrementar tentativas de login
userSchema.methods.incrementLoginAttempts = async function () {
  // Se já passou o tempo de bloqueio, resetar
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.loginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.loginAttempts += 1;
    
    // Bloquear por 2 horas após 5 tentativas
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 2 * 60 * 60 * 1000; // 2 horas
    }
  }
  
  await this.save();
};

// Resetar tentativas de login
userSchema.methods.resetLoginAttempts = async function () {
  if (this.loginAttempts > 0 || this.lockUntil) {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }
};

// Adicionar endereço
userSchema.methods.addAddress = async function (addressData) {
  // Se for marcado como padrão, desmarcar outros
  if (addressData.isDefault) {
    this.addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }
  
  this.addresses.push(addressData);
  await this.save();
  return this.addresses[this.addresses.length - 1];
};

// Atualizar endereço
userSchema.methods.updateAddress = async function (addressId, updateData) {
  const address = this.addresses.id(addressId);
  if (!address) throw new Error("Endereço não encontrado");
  
  // Se for marcado como padrão, desmarcar outros
  if (updateData.isDefault) {
    this.addresses.forEach(addr => {
      if (addr._id.toString() !== addressId) {
        addr.isDefault = false;
      }
    });
  }
  
  Object.assign(address, updateData);
  await this.save();
  return address;
};

// Deletar endereço
userSchema.methods.deleteAddress = async function (addressId) {
  this.addresses = this.addresses.filter(
    addr => addr._id.toString() !== addressId
  );
  await this.save();
};

// Gerar código de verificação de email
userSchema.methods.generateEmailVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationCode = code;
  this.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutos
  return code;
};

// Gerar código de verificação de telefone
userSchema.methods.generatePhoneVerificationCode = function () {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneVerificationCode = code;
  this.phoneVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 minutos
  return code;
};

// Verificar código de email
userSchema.methods.verifyEmailCode = function (code) {
  if (this.emailVerificationExpires < Date.now()) {
    throw new Error("Código expirado");
  }
  
  if (this.emailVerificationCode !== code) {
    throw new Error("Código inválido");
  }
  
  this.emailVerified = true;
  this.emailVerificationCode = null;
  this.emailVerificationExpires = null;
  return true;
};

// Verificar código de telefone
userSchema.methods.verifyPhoneCode = function (code) {
  if (this.phoneVerificationExpires < Date.now()) {
    throw new Error("Código expirado");
  }
  
  if (this.phoneVerificationCode !== code) {
    throw new Error("Código inválido");
  }
  
  this.phoneVerified = true;
  this.phoneVerificationCode = null;
  this.phoneVerificationExpires = null;
  return true;
};

const User = mongoose.model("User", userSchema);

export default User;