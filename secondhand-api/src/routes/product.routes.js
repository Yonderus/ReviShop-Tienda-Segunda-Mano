import { Router } from "express";
import {
  changeProductStatus,
  createProduct,
  getActiveProducts,
  getInactiveProducts,
  getProductById,
  getProductBySlug,
  getProducts,
  getTrashedProducts,
  restoreProduct,
  setProductActive,
  softDeleteProduct,
  updateProduct,
} from "../controllers/product.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  changeStatusSchema,
  createProductSchema,
  idParamsSchema,
  listQuerySchema,
  restoreSchema,
  setActiveSchema,
  slugParamsSchema,
  stateListQuerySchema,
  updateProductSchema,
} from "../validators/product.validator.js";

const router = Router();

router.get("/", validate({ query: listQuerySchema }), getProducts);
router.get("/actives", validate({ query: stateListQuerySchema }), getActiveProducts);
router.get("/inactives", validate({ query: stateListQuerySchema }), getInactiveProducts);
router.get("/trash", validate({ query: stateListQuerySchema }), getTrashedProducts);
router.get("/slug/:slug", validate({ params: slugParamsSchema }), getProductBySlug);
router.get("/:id", validate({ params: idParamsSchema }), getProductById);
router.post("/", validate({ body: createProductSchema }), createProduct);
router.patch("/:id", validate({ params: idParamsSchema, body: updateProductSchema }), updateProduct);
router.patch("/:id/status", validate({ params: idParamsSchema, body: changeStatusSchema }), changeProductStatus);
router.patch("/:id/active", validate({ params: idParamsSchema, body: setActiveSchema }), setProductActive);
router.patch("/:id/restore", validate({ params: idParamsSchema, body: restoreSchema }), restoreProduct);
router.delete("/:id", validate({ params: idParamsSchema }), softDeleteProduct);

export default router;
