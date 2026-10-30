import { categoryService } from "../services/category.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

export const getCategories = async (_req, res, next) => {
  try {
    sendSuccess(res, await categoryService.listPublished());
  } catch (error) {
    next(error);
  }
};

export const getActiveCategories = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.listActives(req.query));
  } catch (error) {
    next(error);
  }
};

export const getInactiveCategories = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.listInactives(req.query));
  } catch (error) {
    next(error);
  }
};

export const getTrashedCategories = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.listTrashed(req.query));
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.getById(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.getBySlug(req.params.slug));
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    sendCreated(res, await categoryService.create(req.body));
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.update(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const setCategoryActive = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.setActive(req.params.id, req.body.isActive));
  } catch (error) {
    next(error);
  }
};

export const restoreCategory = async (req, res, next) => {
  try {
    sendSuccess(res, await categoryService.restore(req.params.id, req.body.isActive));
  } catch (error) {
    next(error);
  }
};

export const softDeleteCategory = async (req, res, next) => {
  try {
    await categoryService.softDelete(req.params.id, req.user);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
