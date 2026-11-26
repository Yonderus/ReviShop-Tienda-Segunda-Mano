import { saleService } from "../services/sale.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

export const registerSale = async (req, res, next) => {
  try {
    sendCreated(res, await saleService.register(req.body, req.user));
  } catch (error) {
    next(error);
  }
};

export const getMySales = async (req, res, next) => {
  try {
    sendSuccess(res, await saleService.listMine(req.user, req.query));
  } catch (error) {
    next(error);
  }
};

export const confirmSale = async (req, res, next) => {
  try {
    sendSuccess(res, await saleService.confirm(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
};

export const rejectSale = async (req, res, next) => {
  try {
    sendSuccess(res, await saleService.reject(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
};

export const cancelSale = async (req, res, next) => {
  try {
    sendSuccess(res, await saleService.cancel(req.params.id, req.user));
  } catch (error) {
    next(error);
  }
};

export const getMyPending = async (req, res, next) => {
  try {
    sendSuccess(res, await saleService.pendingFor(req.user));
  } catch (error) {
    next(error);
  }
};
