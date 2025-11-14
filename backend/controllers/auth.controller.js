import redis from "../db/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import cloudinary from "../lib/cloudinary.js";
import { sendVerificationEmail } from "../lib/email.service.js"

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
  // store the refresh token in the database
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60
  ); // 7 days
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevents JS from reading the cookie data & cross-site scripting attacks
    // sameSite: "none",
    sameSite: "strict", // prevents CSRF attacks
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevents JS from reading the cookie data & cross-site scripting attacks
    // sameSite: "none",
    sameSite: "strict", // prevents CSRF attacks
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

    // check if email already exists
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

    // create user
    const newUser = await User.create({ 
      email, 
      password, 
      name, 
      phone: phone || null
    });

    // authenticate user
    const { accessToken, refreshToken } = generateToken(newUser._id);
    await storeRefreshTokenIn_redis_db(newUser._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    // remove the password from the user data
    // send response to the client with the user data without the password
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

export const login = async (req, res) => {
  const { identifier, password } = req.body;
 
  try {
    if (!identifier || !password) {
      return res.status(400).json({ 
        message: "Email e senha são obrigatórios" 
      });
    }

    const user = await User.findOne({ email: identifier });

    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateToken(user._id);

      await storeRefreshTokenIn_redis_db(user._id, refreshToken);
      setCookies(res, accessToken, refreshToken);

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
    } else {
      res.status(400).json({ message: "Email ou senha inválidos" });
    }
  } catch (error) {
    console.log("Error in login controller:", error);
    res
      .status(500)
      .json({ message: "Erro interno do servidor ao fazer login", error });
  }
};

export const logout = async (req, res) => {
  try {
    // get the refresh token from the cookies
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_TOKEN_SECRET
      );
      // delete the refresh token from the database
      await redis.del(`refresh_token:${decoded.userId}`);
    }

    // clear the cookies
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

// this controller is used to refresh the access token
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
    // as cookies are set in the browser,so its not necessary to send any response to the client because the client will automatically send the access token in the headers and the server will authenticate the user
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