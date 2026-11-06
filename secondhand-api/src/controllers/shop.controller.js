import { shopService } from "../services/shop.service.js";
import { sendSuccess } from "../utils/response.js";

export const getShopProducts = async (req, res, next) => {
  try {
    sendSuccess(res, await shopService.listProducts(req.query));
  } catch (error) {
    next(error);
  }
};

export const getShopProduct = async (req, res, next) => {
  try {
    sendSuccess(res, await shopService.getProduct(req.params.slug));
  } catch (error) {
    next(error);
  }
};

export const getShopCategories = async (_req, res, next) => {
  try {
    sendSuccess(res, await shopService.listCategories());
  } catch (error) {
    next(error);
  }
};

export const getShopSellers = async (_req, res, next) => {
  try {
    sendSuccess(res, await shopService.listSellers());
  } catch (error) {
    next(error);
  }
};

export const getShopLocations = async (_req, res, next) => {
  try {
    sendSuccess(res, await shopService.listLocations());
  } catch (error) {
    next(error);
  }
};
