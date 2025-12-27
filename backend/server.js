import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import axios from "axios";
import path from "path";

// Importing the routes
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import analyticsRoutes from "./routes/analytics.route.js";
import adminProfileRoutes from "./routes/admin.route.js";
import financialRoutes from "./routes/financial.route.js";
import devRoutes from "./routes/dev.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const __dirname = path.resolve();

// ============================================
// CONFIGURAÇÃO CORS AJUSTADA
// ============================================

// Lista de URLs permitidas
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
].filter(Boolean); // Remove undefined

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true);
      
      // Verificar se a origin está na lista permitida
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('Origin bloqueada pelo CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// OU se preferir liberar tudo em desenvolvimento:
// if (process.env.NODE_ENV === "development") {
//   app.use(cors({ origin: true, credentials: true }));
// } else {
//   app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
// }

// Middlewares
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin-profile", adminProfileRoutes);
app.use("/api/financial", financialRoutes);
app.use("/api/dev", devRoutes);

// Rota admin e dev
app.get("/server", (req, res) => {
  res.sendFile(path.join(__dirname, "backend", "pages", "index.html"));
});


// Serve static assets if in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "/frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
  });
}

// Start server
app.listen(PORT, "127.0.0.1", () => {
  console.log("Server is running on http://127.0.0.1:" + PORT);
  console.log("CORS habilitado para:", allowedOrigins);
  connectDB();
 
});