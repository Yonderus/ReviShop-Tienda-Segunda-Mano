import { profileService } from "../services/profile.service.js";
import { sendSuccess } from "../utils/response.js";

// El perfil es siempre el del usuario de la sesión (req.user), nunca uno que llegue en la petición.

export const getMyProfile = async (req, res, next) => {
  try {
    sendSuccess(res, await profileService.getMine(req.user.id));
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    sendSuccess(res, await profileService.updateMine({ _id: req.user.id, name: req.user.name }, req.body));
  } catch (error) {
    next(error);
  }
};
