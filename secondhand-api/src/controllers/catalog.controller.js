import { sellerService } from "../services/seller.service.js";
import { sendSuccess } from "../utils/response.js";

export const getSellers = async (_req, res, next) => {
  try {
    const sellers = await sellerService.list();
    sendSuccess(res, sellers);
  } catch (error) {
    next(error);
  }
};
