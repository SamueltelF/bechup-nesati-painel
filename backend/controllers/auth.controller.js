import redis from "../db/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";
import { sendVerificationEmail } from "../lib/email.service.js"
import { sendPhoneVerification, verifyPhoneCode } from "../lib/sms.service.js";
import VendorVerificationHistory from "../models/historico.model.js";
import VendorProfile from "../models/admin.model.js";

const generateToken = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );

  return { accessToken, refreshToken };
};

const storeRefreshTokenIn_redis_db = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); // 7 days
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, 
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, 
    sameSite: "strict", 
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signup = async (req, res) => {
  const { email, password, name, phone } = req.body;

  try {
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ message: "Email, senha e nome são obrigatórios" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Senha deve ter no mínimo 6 caracteres" });
    }

    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email já está em uso" });
    }

    if (phone) {
      const phoneExists = await User.findOne({ phone });
      if (phoneExists) {
        return res.status(400).json({ message: "Número já está em uso" });
      }
    }

    // criar usu
    const newUser = await User.create({ 
      email, 
      password, 
      name, 
      phone: phone || null
    });

    // auth use
    const { accessToken, refreshToken } = generateToken(newUser._id);
    await storeRefreshTokenIn_redis_db(newUser._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    
    // remove a senha do data do usu
    
    res.send({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      profilePicture: newUser.profilePicture,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified,
      role: newUser.role,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro ao criar usuário", error });
  }
};



// ✅ CORRETO - Espera { identifier, password }
export const login = async (req, res) => {
  const { identifier, password } = req.body;
 
  try {
    // Validação de entrada
    if (!identifier || !password) {
      return res.status(400).json({ 
        message: "Email e senha são obrigatórios" 
      });
    }

    // Buscar usuário por email
    const user = await User.findOne({ email: identifier.toLowerCase().trim() });

    if (!user) {
      return res.status(400).json({ 
        message: "Email ou senha inválidos" 
      });
    }
    if (user.isLocked()) {
      const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({ 
        message: `Conta bloqueada. Tente novamente em ${timeLeft} minutos.` 
      });
    }

  
    if (user.isBanned) {
      return res.status(403).json({ 
        message: `Conta banida. Motivo: ${user.banReason || "Violação dos termos"}` 
      });
    }

    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      
      const attemptsLeft = 5 - user.loginAttempts;
      
      if (attemptsLeft > 0) {
        return res.status(400).json({ 
          message: `Senha inválida. Você tem ${attemptsLeft} tentativa(s) restante(s).` 
        });
      } else {
        return res.status(423).json({ 
          message: "Conta bloqueada por 2 horas devido a múltiplas tentativas de login." 
        });
      }
    }

 
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Gerar tokens
    const { accessToken, refreshToken } = generateToken(user._id);
    await storeRefreshTokenIn_redis_db(user._id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    // Retornar dados do usuário
    res.json({ 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: user.role
      }
    });

  } catch (error) {
    console.log("Error in login controller:", error);
    res.status(500).json({ 
      message: "Erro interno do servidor ao fazer login", 
      error: error.message 
    });
  }
};

export const logout = async (req, res) => {
  try {
   
    //buscar uma refencia de token 
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_TOKEN_SECRET
      );
     
      // deleta a referencia do token de data
      await redis.del(`refresh_token:${decoded.userId}`);
    }

    
    //limpar os cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.log("error while logout:", error);
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao fazer logout", error });
  }
};


// controla os id da referencia do acesso ao token
export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  try {
    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: "Nenhum refresh token fornecido! Por favor faça login" });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Refresh token inválido" });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });
    
    res.json({ message: "Token atualizado com sucesso" });
  } catch (error) {
    console.log("error in refresh token controller:", error);
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao atualizar token", error });
  }
};

//buscar perfil completo
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        role: user.role
      }
    });

  } catch (error) {
    console.log("erro ao buscar perfil:", error);
    res.status(500).json({ message: "Erro ao buscar perfil", error });
  } 
};

export const uploadProfilePicture = async (req, res) => {
  const { image } = req.body;
  
  try {
    if (!image) {
      return res.status(400).json({ message: "Imagem é obrigatória" });
    }

    const user = await User.findById(req.user._id);
    
    if (user.profilePicture) {
      const publicId = user.profilePicture.split('/').pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
      } catch (error) {
        console.log("erro ao deletar imagem antiga:", error);
      }
    }

    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "profile_pictures",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" }, 
        { quality: "auto", fetch_format: "auto" }
      ]
    });
    
    user.profilePicture = uploadResponse.secure_url;
    await user.save();
    
    res.json({ 
      profilePicture: uploadResponse.secure_url,
      message: "Foto atualizada com sucesso"
    });

  } catch (error) {
    console.log("erro ao fazer upload:", error);
    res.status(500).json({ message: "Erro ao fazer upload da foto", error });
  }
};

export const deletarProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profilePicture) {
      return res.status(400).json({ message: "Nenhuma foto de perfil para remover" });
    }

    const publicId = user.profilePicture.split('/').pop().split(".")[0];
    try {
      await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
    } catch (error) {
      console.log("erro ao deletar do cloudinary:", error);
    }

    user.profilePicture = null;
    await user.save();
    res.json({ message: "Foto de perfil deletada com sucesso" });
  } catch (error) {
    console.log("erro ao deletar foto de perfil:", error);
    res.status(500).json({ message: "Erro ao deletar foto de perfil", error });
  }
};

//atualizar email do perfil
export const updateEmail = async (req, res) => {
  const { newEmail, password } = req.body;
  try {
    if (!newEmail || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    const user = await User.findById(req.user._id);
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Senha inválida" });
    }
    if (!user.phone || !user.phoneVerified) {
      return res.status(400).json({ message: "Você precisa ter um número de telefone verificado para trocar o email" });
    }

    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return res.status(400).json({ message: "Email já está em uso" });
    }

    user.email = newEmail.toLowerCase().trim();
    user.emailVerified = false;
    await user.save();

    res.json({ 
      message: "Email atualizado com sucesso, verifique seu novo email",
      email: user.email,
      emailVerified: user.emailVerified
    });

  } catch (error) {
    console.log("erro ao atualizar email:", error);
    res.status(500).json({ message: "Erro ao atualizar email", error });
  }
};

export const forceLogout = async (req, res) => {
  try {
    // Limpar TODOS os cookies possíveis
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    
    // Garantir que limpa mesmo se tiver configurações diferentes
    res.clearCookie("accessToken", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    
    res.json({ 
      message: "Logout forçado realizado com sucesso",
      success: true 
    });
  } catch (error) {
    console.log("erro no logout forçado:", error);
    // Mesmo com erro, limpar cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Cookies limpos", success: true });
  }
};

export const updatePhone = async (req, res) => {
  const { newPhone } = req.body;
  try {
    const user = await User.findById(req.user._id);
    if (!newPhone || newPhone === "") {
      user.phone = null;
      user.phoneVerified = false;
      await user.save();

      return res.json({ 
        message: "Número removido com sucesso",
        phone: null,
        phoneVerified: false
      });
    }

    const phoneExists = await User.findOne({ phone: newPhone, _id: { $ne: user._id } });

    if (phoneExists) {
      return res.status(400).json({ message: "Número já cadastrado" });
    }

    user.phone = newPhone;
    user.phoneVerified = false;
    await user.save();

    res.json({
      message: "Número atualizado com sucesso. Verifique seu número",
      phone: user.phone,
      phoneVerified: user.phoneVerified
    });

  } catch (error) {
    console.log("erro ao atualizar phone:", error);
    res.status(500).json({ message: "Erro ao atualizar telefone", error });
  }
};

export const sendEmailVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email já está verificado" });
    }

    // Gerar código de 6 dígitos
    const code = user.generateEmailVerificationCode();
    await user.save();

    // Enviar email com o código
    try {
      await sendVerificationEmail(user.email, user.name, code);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return res.status(500).json({ 
        message: "Erro ao enviar email de verificação. Tente novamente." 
      });
    }

    res.json({ 
      message: "Código de verificação enviado para seu email",
      email: user.email,
      expiresIn: "15 minutos"
    });

  } catch (error) {
    console.error("Erro ao enviar código de verificação:", error);
    res.status(500).json({ 
      message: "Erro ao enviar código de verificação", 
      error 
    });
  }
};

// Verificar código de email
export const verifyEmailCode = async (req, res) => {
  const { code } = req.body;

  try {
    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        message: "Código deve ter 6 dígitos" 
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email já está verificado" });
    }

    if (!user.emailVerificationCode) {
      return res.status(400).json({ 
        message: "Nenhum código de verificação foi solicitado" 
      });
    }

    // Verificar se o código expirou
    if (user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({ 
        message: "Código expirado. Solicite um novo código" 
      });
    }

    // Verificar se o código está correto
    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ 
        message: "Código inválido" 
      });
    }

    // Marcar email como verificado
    user.emailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ 
      message: "Email verificado com sucesso!",
      emailVerified: true
    });

  } catch (error) {
    console.error("Erro ao verificar código:", error);
    res.status(500).json({ 
      message: "Erro ao verificar código", 
      error 
    });
  }
};

// Enviar código de verificação SMS
export const sendPhoneVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!user.phone) {
      return res.status(400).json({ 
        message: "Adicione um número de telefone primeiro" 
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ 
        message: "Telefone já está verificado" 
      });
    }

    // Validar formato internacional
    if (!user.phone.startsWith('+')) {
      return res.status(400).json({ 
        message: "Número deve estar no formato internacional: +55..." 
      });
    }

    // Enviar código via Twilio
    try {
      await sendPhoneVerification(user.phone);
    } catch (smsError) {
      console.error("Erro ao enviar SMS:", smsError);
      return res.status(500).json({ 
        message: "Erro ao enviar SMS. Verifique o número e tente novamente." 
      });
    }

    res.json({ 
      message: "Código de verificação enviado via SMS",
      phone: user.phone,
      expiresIn: "10 minutos"
    });

  } catch (error) {
    console.error("Erro ao enviar código SMS:", error);
    res.status(500).json({ 
      message: "Erro ao enviar código de verificação", 
      error 
    });
  }
};

// Verificar código SMS
export const verifyPhoneCodeController = async (req, res) => {
  const { code } = req.body;

  try {
    if (!code || code.length !== 6) {
      return res.status(400).json({ 
        message: "Código deve ter 6 dígitos" 
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!user.phone) {
      return res.status(400).json({ 
        message: "Nenhum telefone cadastrado" 
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ 
        message: "Telefone já está verificado" 
      });
    }

    // Verificar código via Twilio
    let verificationResult;
    try {
      verificationResult = await verifyPhoneCode(user.phone, code);
    } catch (verifyError) {
      console.error("Erro ao verificar código:", verifyError);
      return res.status(400).json({ 
        message: "Código inválido ou expirado" 
      });
    }

    if (!verificationResult.success) {
      return res.status(400).json({ 
        message: "Código inválido" 
      });
    }

    // Marcar telefone como verificado
    user.phoneVerified = true;
    await user.save();

    res.json({ 
      message: "Telefone verificado com sucesso!",
      phoneVerified: true
    });

  } catch (error) {
    console.error("Erro ao verificar código SMS:", error);
    res.status(500).json({ 
      message: "Erro ao verificar código", 
      error 
    });
  }
};

// Reenviar código SMS
export const resendPhoneVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!user.phone) {
      return res.status(400).json({ 
        message: "Adicione um número de telefone primeiro" 
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ 
        message: "Telefone já está verificado" 
      });
    }

    // Enviar novo código
    try {
      await sendPhoneVerification(user.phone);
    } catch (smsError) {
      console.error("Erro ao reenviar SMS:", smsError);
      return res.status(500).json({ 
        message: "Erro ao reenviar SMS. Tente novamente." 
      });
    }

    res.json({ 
      message: "Novo código enviado via SMS",
      phone: user.phone,
      expiresIn: "10 minutos"
    });

  } catch (error) {
    console.error("Erro ao reenviar código SMS:", error);
    res.status(500).json({ 
      message: "Erro ao reenviar código", 
      error 
    });
  }
};

// Reenviar código de verificação (com proteção contra spam)
export const resendEmailVerificationCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email já está verificado" });
    }

    // Verificar se ainda há um código válido (evitar spam)
    if (user.emailVerificationExpires && user.emailVerificationExpires > Date.now()) {
      const timeLeft = Math.ceil((user.emailVerificationExpires - Date.now()) / 1000 / 60);
      return res.status(429).json({ 
        message: `Aguarde ${timeLeft} minuto(s) antes de solicitar um novo código` 
      });
    }

    // Gerar novo código
    const code = user.generateEmailVerificationCode();
    await user.save();

    // Enviar email
    try {
      await sendVerificationEmail(user.email, user.name, code);
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
      return res.status(500).json({ 
        message: "Erro ao enviar email de verificação. Tente novamente." 
      });
    }

    res.json({ 
      message: "Novo código enviado para seu email",
      email: user.email,
      expiresIn: "15 minutos"
    });

  } catch (error) {
    console.error("Erro ao reenviar código:", error);
    res.status(500).json({ 
      message: "Erro ao reenviar código", 
      error 
    });
  }

};

export const submitVendorApplication = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      fullName, 
      cpf, 
      dateOfBirth, 
      displayName
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
    // CRIAR REGISTRO NO HISTÓRICO DE VERIFICAÇÃO
    // ============================================

   const verificationRecord = await VendorVerificationHistory.create({
      userId,
      // ✅ NÃO inclua vendorProfileId aqui
      submittedData: {
        fullName: fullName.trim(),
        displayName: displayName?.trim() || fullName.trim(),
        cpf: cleanedCPF,
        dateOfBirth: birthDate
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

/**
 * Buscar status da submissão do usuário
 * Rota: GET /api/auth/vendor-application-status
 */
export const getVendorApplicationStatus = async (req, res) => {
  try {
    const userId = req.user._id;

    // Buscar submissão mais recente
    const submission = await VendorVerificationHistory.findOne({ userId })
      .sort({ submittedAt: -1 })
      .select("-submittedData.personalPhoto -submittedData.rgFrontPhoto -submittedData.rgBackPhoto");

    if (!submission) {
      return res.json({
        hasSubmission: false,
        message: "Nenhuma solicitação encontrada"
      });
    }

    res.json({
      hasSubmission: true,
      submission: {
        id: submission._id,
        status: submission.verificationStatus,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        decision: submission.decision
      }
    });

  } catch (error) {
    console.error("Erro ao buscar status:", error);
    res.status(500).json({ 
      message: "Erro ao buscar status da solicitação", 
      error: error.message 
    });
  }
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Validar CPF (algoritmo oficial)
 */
function validateCPF(cpf) {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  let remainder;

  // Validar primeiro dígito
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  sum = 0;
  // Validar segundo dígito
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Calcular idade
 */
function calculateAge(birthDate) {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

