import express from "express";
import {
  verifyDevPassword,
  listCustomers,
  listSellers,
  promoteToSeller,
  demoteToCustomer,
  deleteSellerProfile,
  getCustomerDetails,
  getDevStats,
} from "../controllers/dev.controller.js";

const router = express.Router();

// ============================================
// TODAS AS ROTAS REQUEREM SENHA DE DEV
// ============================================

// Estatísticas gerais
router.post("/stats", verifyDevPassword, getDevStats);

// Listar customers (não-vendedores)
router.post("/customers", verifyDevPassword, listCustomers);

// Listar vendedores (com AdminProfile)
router.post("/sellers", verifyDevPassword, listSellers);

// Ver detalhes de um customer
router.post("/customer/:userId", verifyDevPassword, getCustomerDetails);

// Promover customer para vendedor
router.post("/promote/:userId", verifyDevPassword, promoteToSeller);

// Rebaixar vendedor para customer
router.post("/demote/:userId", verifyDevPassword, demoteToCustomer);

// Deletar perfil de vendedor (CUIDADO - apenas dev/testes)
router.delete("/seller/:userId", verifyDevPassword, deleteSellerProfile);

export default router;