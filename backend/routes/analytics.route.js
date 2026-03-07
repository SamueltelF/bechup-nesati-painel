import express from "express";
import {  protectRoute } from "../middleware/auth.middleware.js";
import { getSalesData } from "../controllers/analytic.controller.js";

const router = express.Router();

router.get("/", protectRoute,  getSalesData);

export default router;
