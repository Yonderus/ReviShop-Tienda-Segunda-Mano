import { authService } from "../services/auth.service.js";
import { sendNoContent, sendSuccess } from "../utils/response.js";

export const login = async (req, res, next) => {
  try {
    sendSuccess(res, await authService.login(req.body));
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    sendSuccess(res, await authService.me(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user, req.auth);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};
