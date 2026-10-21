import { productService } from "../services/product.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

export const getProducts = async (req, res, next) => {
  try {
    const products = await productService.list(req.query);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const getActiveProducts = async (req, res, next) => {
  try {
    const products = await productService.listActives(req.query);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const getInactiveProducts = async (req, res, next) => {
  try {
    const products = await productService.listInactives(req.query);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const getTrashedProducts = async (req, res, next) => {
  try {
    const products = await productService.listTrashed(req.query);
    sendSuccess(res, products);
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getBySlug(req.params.slug);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);
    sendCreated(res, product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const changeProductStatus = async (req, res, next) => {
  try {
    const product = await productService.changeStatus(req.params.id, req.body.status);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const setProductActive = async (req, res, next) => {
  try {
    const product = await productService.setActive(req.params.id, req.body.isActive);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const restoreProduct = async (req, res, next) => {
  try {
    const product = await productService.restore(req.params.id, req.body.isActive);
    sendSuccess(res, product);
  } catch (error) {
    next(error);
  }
};

export const softDeleteProduct = async (req, res, next) => {
  try {
    await productService.softDelete(req.params.id);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
