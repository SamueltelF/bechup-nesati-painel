import express from "express";
import {
  verifyDevPassword,
  listCustomers,
  listSellers,
  promoteToSeller,
  demoteToCustomer,
  deleteSellerProfile,
  getCustomerDetails,
  getDevStats
} from "../controllers/dev.controller.js";

const router = express.Router();

// ============================================
// MIDDLEWARE DE VERIFICAÇÃO
// ============================================
// Aplica verificação de senha em todas as rotas
router.use(verifyDevPassword);

// ============================================
// ROTAS DE ESTATÍSTICAS (DASHBOARD)
// ============================================
router.get("/stats", getDevStats);

// ============================================
// ROTAS DE CUSTOMERS (CLIENTES)
// ============================================
router.get("/customers", listCustomers);
router.get("/customers/:userId", getCustomerDetails);

// ============================================
// ROTAS DE SELLERS (VENDEDORES)
// ============================================
router.get("/sellers", listSellers);

// ============================================
// ROTAS DE PROMOÇÃO/REBAIXAMENTO
// ============================================
router.post("/promote/:userId", promoteToSeller);
router.post("/demote/:userId", demoteToCustomer);

// ============================================
// ROTAS DE DELEÇÃO (CUIDADO - APENAS DEV)
// ============================================
router.delete("/sellers/:userId", deleteSellerProfile);

export default router;