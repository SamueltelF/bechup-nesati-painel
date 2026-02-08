export const submitVendorApplication = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      fullName, 
      cpf, 
      dateOfBirth, 
      displayName,
      personalPhoto,
      rgFrontPhoto,
      rgBackPhoto
    } = req.body;

    // ============================================
    // VALIDAÇÕES
    // ============================================

    if (!fullName || fullName.trim().length < 3) {
      return res.status(400).json({ 
        message: "Nome completo é obrigatório (mínimo 3 caracteres)" 
      });
    }

    // Validar CPF
    const cleanedCPF = cpf.replace(/\D/g, "");
    if (!validateCPF(cleanedCPF)) {
      return res.status(400).json({ 
        message: "CPF inválido" 
      });
    }

    // Validar idade (18+)
    const birthDate = new Date(dateOfBirth);
    const age = calculateAge(birthDate);
    if (age < 18) {
      return res.status(400).json({ 
        message: "Você deve ter no mínimo 18 anos para ser vendedor" 
      });
    }

    // Validar fotos
    if (!personalPhoto || !rgFrontPhoto || !rgBackPhoto) {
      return res.status(400).json({ 
        message: "Todas as fotos são obrigatórias (foto pessoal, RG frente e verso)" 
      });
    }

    // ============================================
    // VERIFICAR SE JÁ EXISTE SUBMISSÃO PENDENTE
    // ============================================

    const existingSubmission = await VendorVerificationHistory.findOne({
      userId,
      verificationStatus: { $in: ["pending", "under_review"] }
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        message: "Você já possui uma solicitação em análise. Aguarde a resposta da equipe.",
        submissionId: existingSubmission._id,
        status: existingSubmission.verificationStatus
      });
    }

    // Verificar se já foi aprovado antes
    const existingVendor = await VendorProfile.findOne({ 
      userId,
      verificationStatus: "approved" 
    });

    if (existingVendor) {
      return res.status(400).json({ 
        message: "Você já é um vendedor aprovado!" 
      });
    }

    // ============================================
    // UPLOAD DAS FOTOS NO CLOUDINARY
    // ============================================

    const [personalPhotoUrl, rgFrontUrl, rgBackUrl] = await Promise.all([
      uploadToCloudinary(personalPhoto, "vendor_verification/personal_photos"),
      uploadToCloudinary(rgFrontPhoto, "vendor_verification/rg_front"),
      uploadToCloudinary(rgBackPhoto, "vendor_verification/rg_back")
    ]);

    // ============================================
    // CRIAR REGISTRO NO HISTÓRICO DE VERIFICAÇÃO
    // ✅ REMOVENDO vendorProfileId (será adicionado depois da aprovação)
    // ============================================

    const verificationRecord = await VendorVerificationHistory.create({
      userId,
      // ✅ NÃO inclua vendorProfileId aqui
      submittedData: {
        fullName: fullName.trim(),
        displayName: displayName?.trim() || fullName.trim(),
        cpf: cleanedCPF,
        dateOfBirth: birthDate,
        personalPhoto: personalPhotoUrl,
        rgFrontPhoto: rgFrontUrl,
        rgBackPhoto: rgBackUrl,
      },
      verificationStatus: "pending",
      submittedAt: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // ============================================
    // ADICIONAR ROLE "vendor" TEMPORÁRIO (PENDENTE)
    // ============================================

    const user = await User.findById(userId);
    if (!user.role.includes("vendor")) {
      user.role.push("vendor");
      await user.save();
    }

    // ============================================
    // RETORNAR SUCESSO
    // ============================================

    res.status(201).json({
      success: true,
      message: "Solicitação enviada com sucesso! Aguarde a análise da equipe (24-72h úteis).",
      submission: {
        id: verificationRecord._id,
        status: verificationRecord.verificationStatus,
        submittedAt: verificationRecord.submittedAt
      },
      user: {
        id: user._id,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Erro ao submeter aplicação de vendedor:", error);
    res.status(500).json({ 
      message: "Erro ao enviar solicitação", 
      error: error.message 
    });
  }
};