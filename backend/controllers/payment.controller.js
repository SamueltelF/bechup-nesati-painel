import { stripe } from "../lib/stripe.js";
import Coupon from "../models/coupen.model.js";
import Order from "../models/order.model.js";
import nodemailer from 'nodemailer';

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou outro serviço de e-mail
  auth: {
    user: process.env.EMAIL_USER, // seu e-mail
    pass: process.env.EMAIL_PASS, // sua senha
  },
});

// Função para criar uma sessão de checkout
export const createCheckoutSession = async (req, res) => {
  try {
    const { products, couponCode } = req.body;

    // Validação da matriz de produtos
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Matriz de produtos inválida ou vazia" });
    }

    let totalAmount = 0;

    // Mapeia os produtos para os itens da linha do Stripe
    const lineItems = products.map((product) => {
      const amount = Math.round(product.price * 100); // Stripe espera o valor em centavos
      totalAmount += amount * product.quantity;

      return {
        price_data: {
          currency: "brl",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
        quantity: product.quantity || 1,
      };
    });

    // Verifica se um cupom foi fornecido
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });
      if (coupon) {
        totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
      }
    }

    // Cria a sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts: coupon ? [{ coupon: await createStripeCoupon(coupon.discountPercentage) }] : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(products.map((p) => ({
          id: p._id,
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          image: p.image,
          produtoV: p.produtoV // Incluindo produtoV aqui
        }))),
      },
    });

    // Cria um novo cupom se o total for maior ou igual a R$200,00
    if (totalAmount >= 20000) {
      await createNewCoupon(req.user._id);
    }

    // Retorna a sessão de checkout e o total
    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ message: "Erro ao processar a finalização da compra", error: error.message });
  }
};

// Função para processar o sucesso do checkout
export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verifica se o pagamento foi realizado
    if (session.payment_status === "paid") {
      console.log("Pagamento realizado com sucesso:", session);

      // Desativa o cupom se foi utilizado
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          { isActive: false }
        );
      }

      // Recupera os produtos da metadata
      const products = JSON.parse(session.metadata.products);
      const newOrder = new Order({
        user: session.metadata.userId,
        products: products.map((product) => ({
          product: product.id,
          quantity: product.quantity,
          price: product.price,
          name: product.name,
          image: product.image,
          produtoV: product.produtoV, // Agora pegando produtoV
        })),
        totalAmount: session.amount_total / 100, // converte de centavos para BRL
        stripeSessionId: sessionId,
      });

      await newOrder.save();
      console.log("Novo pedido criado:", newOrder);

      // Formatar os detalhes dos produtos para o e-mail
      const productDetails = products.map(product => {
        return `
          <div style="margin-bottom: 20px; border: 1px solid #FF1493; border-radius: 5px; padding: 10px;">
            <img src="${product.image}" alt="${product.name}" style="width: 100px; height: auto; border-radius: 5px;"/>
            <div style="margin-left: 120px;">
              <b>Produto:</b> <strong><font color="#FF1493">${product.name}</font></strong><br>
 <b>Quantidade:</b> <strong><font color="#FF1493">${product.quantity}</font></strong><br>
              <b>Preço:</b> <strong><font color="#FF1493">R$ ${product.price.toFixed(2)}</font></strong><br>
              <a href="${product.produtoV}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #FF1493; color: white; text-decoration: none; border-radius: 5px;">Ver Produto</a>
            </div>
          </div>
        `;
      }).join('');

      // Enviar e-mail de confirmação
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: req.user.email,
        subject: 'Confirmação de Pagamento',
        html: `
          <h1>Olá!</h1>
          <p>Seu pagamento foi realizado com sucesso! Seu pedido ID é: <strong>${newOrder._id}</strong>.</p>
          <p>Detalhes do seu pedido:</p>
          <br>
          ${productDetails}
          <p><font color="#3fff00">Obrigado pela sua compra!</font></p>
        `,
      };

      // Envia o e-mail e loga o resultado
      await transporter.sendMail(mailOptions);
      console.log("E-mail de confirmação enviado para:", req.user.email);

      res.status(200).json({
        success: true,
        message: "Pagamento bem-sucedido, pedido criado e cupom desativado se usado.",
        orderId: newOrder._id,
      });
      
    } else {
      console.log("Pagamento não realizado. Status do pagamento:", session.payment_status);
      res.status(400).json({ message: "Pagamento não realizado." });
    }
  } catch (error) {
    console.error("Erro ao processar a finalização da compra com sucesso:", error);
    res.status(500).json({
      message: "Erro ao processar a finalização da compra",
      error: error.message,
    });
  }
};

// Função para criar um cupom no Stripe
async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });

  return coupon.id;
}

// Função para criar um novo cupom para o usuário
async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });

  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 1,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias a partir de agora
    userId: userId,
  });

  await newCoupon.save();
  console.log("Novo cupom criado para o usuário:", userId, "Código do cupom:", newCoupon.code);

  return newCoupon;
}