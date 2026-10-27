import { roleService } from "../services/role.service.js";
import { sendSuccess } from "../utils/response.js";

export const getRoles = async (_req, res, next) => {
  try {
    sendSuccess(res, await roleService.listAssignable());
  } catch (error) {
    next(error);
  }
};
