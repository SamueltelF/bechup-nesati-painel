import express from "express";
import {
  // Autenticação
  adminLogin,
  adminLogout,
  checkAdminSession,
  
  // Dashboard
  getDashboardStats,
  
  // Pesquisas
  searchUsers,
  searchProducts,
  searchVendors,
  searchPayments,
  
  // Relatórios
  getProductsReport,
  getGeneralReport,
  
  // Atividades
  getRecentActivities
} from "../controllers/dev.controller.js";


import { 
  protectAdminRoute, 
  checkAdminRole, 
  rateLimitAdmin 
} from "../middleware/admin.middleware.js"; 

const router = express.Router();

// ROTAS PÚBLICAS (SEM PROTEÇÃO)
router.post("/login", adminLogin);

// ROTAS PROTEGIDAS (REQUER AUTENTICAÇÃO)

// Aplicar proteção e rate limit em todas as rotas abaixo
router.use(protectAdminRoute);
router.use(rateLimitAdmin(100, 15 * 60 * 1000));

// Autenticação
router.post("/logout", adminLogout);
router.get("/session", checkAdminSession);

// Dashboard
router.get("/dashboard-stats", getDashboardStats);
router.get("/recent-activities", getRecentActivities);

// Pesquisas
router.get("/search-users", searchUsers);
router.get("/search-products", searchProducts);
router.get("/search-vendors", searchVendors);
router.get("/search-payments", searchPayments);

// Relatórios
router.get("/products-report", getProductsReport);
router.get("/general-report", getGeneralReport);

// ROTAS APENAS PARA SUPER ADMIN

router.delete("/delete-user/:id", checkAdminRole("super_admin"), (req, res) => {
  res.json({ message: "Usuário deletado (apenas super_admin)" });
});

router.post("/create-admin", checkAdminRole("super_admin"), (req, res) => {
  res.json({ message: "Admin criado (apenas super_admin)" });
});

export default router;