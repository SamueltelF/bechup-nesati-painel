import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js"
import { isVerifiedAdmin } from "../middleware/admin.middleware.js"
import {
  createProduct,
  getMyProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateStock,
  getVendorProducts,
  getAllProducts,
  getProductDetails,
} from "../controllers/admin.controller.js"

const router = express.Router();

// ROTAS PÚBLICAS (Clientes)

// Buscar todos os produtos da plataforma
router.get("/", getAllProducts)

// Buscar detalhes de um produto específico
router.get("/details/:productId", getProductDetails)

// Buscar produtos de um vendedor específico
router.get("/vendor/:vendorId", getVendorProducts)

// ROTAS DO VENDEDOR (Protegidas)

// Buscar meus produtos
router.get("/my-products", protectRoute, isVerifiedAdmin, getMyProducts)

// Buscar um produto específico meu
router.get("/my-products/:productId", protectRoute, isVerifiedAdmin, getProductById)

// Criar novo produto
router.post("/create", protectRoute, isVerifiedAdmin, createProduct)

// Atualizar produto
router.put("/update/:productId", protectRoute, isVerifiedAdmin, updateProduct)

// Deletar produto (soft delete)
router.delete("/delete/:productId", protectRoute, isVerifiedAdmin, deleteProduct)

// Atualizar estoque
router.patch("/stock/:productId", protectRoute, isVerifiedAdmin, updateStock)

export default router