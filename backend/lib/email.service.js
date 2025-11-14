// lib/email.service.js
// Estrutura básica - você precisará configurar um serviço de email real
// Opções populares: Nodemailer, SendGrid, Resend, AWS SES, etc.

import nodemailer from "nodemailer";

// Configurar transportador (exemplo com Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail", // ou use SMTP customizado
  auth: {
    user: process.env.EMAIL_USER, // seu email
    pass: process.env.EMAIL_PASSWORD, // senha de aplicativo do Gmail
  },
});

// Alternativa com SMTP genérico:
/*
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
*/

export const sendVerificationEmail = async (email, name, code) => {
  const mailOptions = {
    from: `"Sua Loja" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Código de Verificação de Email",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .header {
              background: rgba(255,255,255,0.1);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
            }
            .content {
              background: white;
              padding: 40px 30px;
              text-align: center;
            }
            .greeting {
              font-size: 18px;
              color: #333;
              margin-bottom: 20px;
            }
            .message {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            .code-box {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 20px;
              border-radius: 15px;
              margin: 30px 0;
              box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            .warning {
              font-size: 14px;
              color: #e74c3c;
              margin-top: 20px;
              font-weight: bold;
            }
            .footer {
              background: #f8f8f8;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
            .expiry {
              display: inline-block;
              background: #fff3cd;
              color: #856404;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 14px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Verificação de Email</h1>
            </div>
            <div class="content">
              <div class="greeting">
                Olá, <strong>${name}</strong>! 👋
              </div>
              <div class="message">
                Recebemos uma solicitação para verificar seu endereço de email. 
                Use o código abaixo para completar a verificação:
              </div>
              <div class="code-box">
                ${code}
              </div>
              <div class="expiry">
                ⏰ Este código expira em 15 minutos
              </div>
              <div class="warning">
                ⚠️ Se você não solicitou este código, ignore este email.
              </div>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} Nesati. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Olá, ${name}!
      
      Seu código de verificação de email é: ${code}
      
      Este código expira em 15 minutos.
      
      Se você não solicitou este código, ignore este email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email enviado:", info.messageId);
    return info;
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
};

// Função para testar configuração de email
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ Servidor de email conectado e pronto para enviar emails");
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com servidor de email:", error);
    return false;
  }
};