import { productService } from "../services/product.service.js";
import { catchAsync } from "../utils/catchAsync.js";
import { sendSuccess, sendCreated, sendNoContent } from "../utils/response.js";

export const productController = {
  list: catchAsync(async (req, res) => {
    const products = await productService.list(req.query);
    sendSuccess(res, products);
  }),

  listActives: catchAsync(async (req, res) => {
    const products = await productService.listActives(req.query);
    sendSuccess(res, products);
  }),

  listInactives: catchAsync(async (req, res) => {
    const products = await productService.listInactives(req.query);
    sendSuccess(res, products);
  }),

  listTrashed: catchAsync(async (req, res) => {
    const products = await productService.listTrashed(req.query);
    sendSuccess(res, products);
  }),

  getById: catchAsync(async (req, res) => {
    const product = await productService.getById(req.params.id);
    sendSuccess(res, product);
  }),

  getBySlug: catchAsync(async (req, res) => {
    const product = await productService.getBySlug(req.params.slug);
    sendSuccess(res, product);
  }),

  create: catchAsync(async (req, res) => {
    const product = await productService.create(req.body);
    sendCreated(res, product);
  }),

  update: catchAsync(async (req, res) => {
    const product = await productService.update(req.params.id, req.body);
    sendSuccess(res, product);
  }),

  setActive: catchAsync(async (req, res) => {
    const product = await productService.setActive(req.params.id, req.body.isActive);
    sendSuccess(res, product);
  }),

  restore: catchAsync(async (req, res) => {
    const product = await productService.restore(req.params.id, req.body.isActive);
    sendSuccess(res, product);
  }),

  softDelete: catchAsync(async (req, res) => {
    await productService.softDelete(req.params.id);
    sendNoContent(res);
  }),
};
