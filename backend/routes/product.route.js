import express from "express";
import { protectRoute, isVerifiedVendor, isProductOwner } from "../middleware/auth.middleware.js";
import {
  getAllProducts,
  getProductDetails,
  getVendorProducts,
  getMyProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} from "../controllers/vendor.controller.js";

const router = express.Router();

// Públicas
router.get("/", getAllProducts);
router.get("/details/:productId", getProductDetails);
router.get("/vendor/:vendorId", getVendorProducts);

// Privadas
router.get("/my-products", protectRoute, isVerifiedVendor, getMyProducts);
router.post("/create", protectRoute, isVerifiedVendor, createProduct);
router.get("/my-products/:productId", protectRoute, isVerifiedVendor, isProductOwner, getProductById);
router.put("/update/:productId", protectRoute, isVerifiedVendor, isProductOwner, updateProduct);
router.delete("/delete/:productId", protectRoute, isVerifiedVendor, isProductOwner, deleteProduct);
router.patch("/stock/:productId", protectRoute, isVerifiedVendor, isProductOwner, updateStock);

export default router;