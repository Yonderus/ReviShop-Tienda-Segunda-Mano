import { userService } from "../services/user.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

export const getSellers = async (_req, res, next) => {
  try {
    sendSuccess(res, await userService.listSellers());
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.list(req.query));
  } catch (error) {
    next(error);
  }
};

export const getActiveUsers = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.listActives(req.query));
  } catch (error) {
    next(error);
  }
};

export const getInactiveUsers = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.listInactives(req.query));
  } catch (error) {
    next(error);
  }
};

export const getTrashedUsers = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.listTrashed(req.query));
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.getById(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const getUserBySlug = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.getBySlug(req.params.slug));
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    sendCreated(res, await userService.create(req.body));
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.update(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
};

export const setUserActive = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.setActive(req.params.id, req.body.isActive));
  } catch (error) {
    next(error);
  }
};

export const restoreUser = async (req, res, next) => {
  try {
    sendSuccess(res, await userService.restore(req.params.id, req.body.isActive));
  } catch (error) {
    next(error);
  }
};

export const softDeleteUser = async (req, res, next) => {
  try {
    await userService.softDelete(req.params.id, req.user);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
