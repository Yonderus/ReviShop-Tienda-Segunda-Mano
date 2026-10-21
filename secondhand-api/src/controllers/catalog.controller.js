import { categoryService } from "../services/category.service.js";
import { sellerService } from "../services/seller.service.js";
import { sendSuccess } from "../utils/response.js";

export const getCategories = async (_req, res, next) => {
  try {
    const categories = await categoryService.listPublished();
    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const getSellers = async (_req, res, next) => {
  try {
    const sellers = await sellerService.list();
    sendSuccess(res, sellers);
  } catch (error) {
    next(error);
  }
};
