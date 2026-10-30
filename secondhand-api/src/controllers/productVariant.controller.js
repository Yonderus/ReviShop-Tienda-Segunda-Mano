import { productVariantService } from "../services/productVariant.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

export const getProductVariants = async (req, res, next) => {
  try {
    const variants = await productVariantService.listByProduct(req.params.id, req.user);
    sendSuccess(res, variants);
  } catch (error) {
    next(error);
  }
};

export const createProductVariant = async (req, res, next) => {
  try {
    const variant = await productVariantService.create(req.params.id, req.body, req.user);
    sendCreated(res, variant);
  } catch (error) {
    next(error);
  }
};

export const updateVariant = async (req, res, next) => {
  try {
    const variant = await productVariantService.update(req.params.id, req.body, req.user);
    sendSuccess(res, variant);
  } catch (error) {
    next(error);
  }
};

export const changeVariantStatus = async (req, res, next) => {
  try {
    const variant = await productVariantService.changeStatus(req.params.id, req.body.status, req.user);
    sendSuccess(res, variant);
  } catch (error) {
    next(error);
  }
};

export const setVariantActive = async (req, res, next) => {
  try {
    const variant = await productVariantService.setActive(req.params.id, req.body.isActive, req.user);
    sendSuccess(res, variant);
  } catch (error) {
    next(error);
  }
};

export const softDeleteVariant = async (req, res, next) => {
  try {
    await productVariantService.softDelete(req.params.id, req.user);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
