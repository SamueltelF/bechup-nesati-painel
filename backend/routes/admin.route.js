import express from "express";
import { protectRoute, isVerifiedVendor } from "../middleware/auth.middleware.js";
import {
  getMyVendorProfile,
  updateBankDetails,
  updateDisplayName,
  getVendorStats,
} from "../controllers/vendor.controller.js";

const router = express.Router();

router.use(protectRoute, isVerifiedVendor);

router.get("/profile", getMyVendorProfile);
router.put("/profile/display-name", updateDisplayName);
router.put("/profile/bank-details", updateBankDetails);
router.get("/stats", getVendorStats);

export default router;