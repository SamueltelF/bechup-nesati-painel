import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Informações de autenticação
    name: {
      type: String,
      required: [true, "Nome é obrigatório"],
    },
    email: {
      type: String,
      required: [true, "Email é obrigatório"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: [true, "Senha é obrigatória"],
      minlength: [6, "Senha deve ter no mínimo 6 caracteres"],
    },

    // Foto de perfil
    profilePicture: {
      type: String, // URL da foto de perfil pública
      default: null,
    },

    // Carrinho de compras
    cartItems: [
      {
        quantity: {
          type: Number,
          default: 1,
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
      },
    ],

    // Histórico de compras
    purchaseHistory: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        products: [
          {
            product: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Product",
            },
            quantity: {
              type: Number,
              default: 1,
            },
            price: {
              type: Number,
              required: true,
            },
          },
        ],
        totalAmount: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
          default: "pending",
        },
        purchaseDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Produtos favoritos
    favoriteProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Role de usuário
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password before saving to database
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

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// Método para adicionar produto aos favoritos
userSchema.methods.addToFavorites = async function (productId) {
  if (!this.favoriteProducts.includes(productId)) {
    this.favoriteProducts.push(productId);
    await this.save();
  }
};

// Método para remover produto dos favoritos
userSchema.methods.removeFromFavorites = async function (productId) {
  this.favoriteProducts = this.favoriteProducts.filter(
    (id) => id.toString() !== productId.toString()
  );
  await this.save();
};

// Método para adicionar compra ao histórico
userSchema.methods.addPurchase = async function (purchaseData) {
  this.purchaseHistory.push(purchaseData);
  await this.save();
};

const User = mongoose.model("User", userSchema);

export default User;