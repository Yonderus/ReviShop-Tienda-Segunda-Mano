import { Router } from "express";
import { productController } from "../controllers/product.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  createProductSchema,
  updateProductSchema,
  setActiveSchema,
  restoreSchema,
  idParamsSchema,
  slugParamsSchema,
  listQuerySchema,
  stateListQuerySchema,
} from "../validators/product.validator.js";

const router = Router();

router.get("/", validate({ query: listQuerySchema }), productController.list);
router.get("/actives", validate({ query: stateListQuerySchema }), productController.listActives);
router.get("/inactives", validate({ query: stateListQuerySchema }), productController.listInactives);
router.get("/trash", validate({ query: stateListQuerySchema }), productController.listTrashed);
router.get("/slug/:slug", validate({ params: slugParamsSchema }), productController.getBySlug);
router.get("/:id", validate({ params: idParamsSchema }), productController.getById);
router.post("/", validate({ body: createProductSchema }), productController.create);
router.patch("/:id", validate({ params: idParamsSchema, body: updateProductSchema }), productController.update);
router.patch("/:id/active", validate({ params: idParamsSchema, body: setActiveSchema }), productController.setActive);
router.patch("/:id/restore", validate({ params: idParamsSchema, body: restoreSchema }), productController.restore);
router.delete("/:id", validate({ params: idParamsSchema }), productController.softDelete);

export default router;
