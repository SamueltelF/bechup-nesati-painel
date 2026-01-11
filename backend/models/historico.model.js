import mongoose from "mongoose";

const vendorVerificationHistorySchema = new mongoose.Schema(
  {
    // REFERÊNCIA AO VENDEDOR
    vendorProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VendorProfile",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // DADOS PESSOAIS SUBMETIDOS (BACKUP)
    submittedData: {
      fullName: String,
      cpf: String,
      dateOfBirth: Date,
      personalPhoto: String,
      rgFrontPhoto: String,
      rgBackPhoto: String,
      bankDetails: {
        bankName: String,
        accountType: String,
        accountNumber: String,
        agency: String,
        pixKey: String,
      },
    },

    // PRODUTOS SUBMETIDOS (SE HOUVER)
    submittedProducts: [
      {
        name: String,
        description: String,
        price: Number,
        image: String,
        category: String,
        produtoV: String,
        submittedAt: Date,
      }
    ],

    // STATUS DA VERIFICAÇÃO
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      required: true,
    },

    // DECISÃO
    decision: {
      madeBy: {
        type: String, // Nome do admin que tomou a decisão
        default: null,
      },
      madeAt: {
        type: Date,
        default: null,
      },
      action: {
        type: String,
        enum: ["approved", "rejected", null],
        default: null,
      },
      reason: {
        type: String,
        default: null,
      },
      notes: {
        type: String,
        default: null,
      },
    },

    // AUDITORIA
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    
    // METADADOS
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// ÍNDICES
vendorVerificationHistorySchema.index({ vendorProfileId: 1 });
vendorVerificationHistorySchema.index({ userId: 1 });
vendorVerificationHistorySchema.index({ verificationStatus: 1 });
vendorVerificationHistorySchema.index({ "decision.madeAt": -1 });

const VendorVerificationHistory = mongoose.model(
  "VendorVerificationHistory",
  vendorVerificationHistorySchema
);

export default VendorVerificationHistory;