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
  getRecentActivities,

  //Historicos
  getVerificationHistory,
  getVerificationDetails,
  getVerificationStats,
  approveVendorWithHistory,
  rejectVendorWithHistory,

  //pdf
  generateVerificationPDFController
} from "../controllers/dev.controller.js";

// ✅ IMPORTAR OS ALIASES
import { 
  protectDevPanel,
  checkDevPanelRole,
  rateLimitDevPanel
} from "../middleware/admin.middleware.js";



const router = express.Router();

// ============================================
// ROTAS PÚBLICAS
// ============================================

router.post("/login", adminLogin);

// ============================================
// ROTAS PROTEGIDAS
// ============================================

// ✅ USAR OS ALIASES
router.use(protectDevPanel);
router.use(rateLimitDevPanel(100, 15 * 60 * 1000));

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

// Verificações de Vendedores
router.get("/verification-history", getVerificationHistory);
router.get("/verification-history/:historyId", getVerificationDetails);
router.get("/verification-stats", getVerificationStats);

// Aprovar/Rejeitar Vendedores
router.post("/vendors/:vendorId/approve", approveVendorWithHistory);
router.post("/vendors/:vendorId/reject", rejectVendorWithHistory);

router.get("/verification/:historyId/pdf", generateVerificationPDFController);

// ============================================
// ROTAS SUPER ADMIN
// ============================================

// ✅ USAR checkDevPanelRole
router.delete("/delete-user/:id", checkDevPanelRole("super_admin"), (req, res) => {
  res.json({ message: "Usuário deletado (apenas super_admin)" });
});

router.post("/create-admin", checkDevPanelRole("super_admin"), (req, res) => {
  res.json({ message: "Admin criado (apenas super_admin)" });
});

export default router;