import express from "express";
import { protectRoute, isVerifiedVendor } from "../middleware/auth.middleware.js"
//import { isVerifiedVendor } from "../middleware/admin.middleware.js"
import {
  getBalance,
  getBalanceHistory,
  getMySales,
  getSaleDetails,
  updateTrackingCode,
  requestWithdrawal,
  getWithdrawalHistory,
  getDashboard,
} from "../controllers/financial.controller.js"

const router = express.Router()

// Todas as rotas requerem autenticação E perfil de vendedor verificado
router.use(protectRoute, isVerifiedVendor)

// Dashboard
router.get("/dashboard", getDashboard)

// Saldo
router.get("/balance", getBalance)
router.get("/balance/history", getBalanceHistory)

// Vendas
router.get("/sales", getMySales)
router.get("/sales/:orderId", getSaleDetails)
router.put("/sales/:orderId/tracking", updateTrackingCode)

// Saques
router.post("/withdrawal/request", requestWithdrawal)
router.get("/withdrawal/history", getWithdrawalHistory)

export default router