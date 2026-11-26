import { reportService } from "../services/report.service.js";
import { reviewService } from "../services/review.service.js";
import { sendCreated, sendSuccess } from "../utils/response.js";

export const createReview = async (req, res, next) => {
  try {
    sendCreated(res, await reviewService.create(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
};

export const replyToReview = async (req, res, next) => {
  try {
    sendSuccess(res, await reviewService.reply(req.params.id, req.body.text, req.user));
  } catch (error) {
    next(error);
  }
};

export const reportReview = async (req, res, next) => {
  try {
    sendCreated(res, await reportService.reportReview(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
};

export const getPublicProfile = async (req, res, next) => {
  try {
    sendSuccess(res, await reviewService.publicProfile(req.params.slug));
  } catch (error) {
    next(error);
  }
};

export const getPublicReviews = async (req, res, next) => {
  try {
    sendSuccess(res, await reviewService.listPublic(req.params.slug, req.query));
  } catch (error) {
    next(error);
  }
};

// ── Moderación (solo admin) ──

export const getReports = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    sendSuccess(res, await reportService.list({ view: status, page, limit }));
  } catch (error) {
    next(error);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    sendSuccess(res, await reportService.resolve(req.params.id, req.body.action, req.user));
  } catch (error) {
    next(error);
  }
};

export const setReviewHidden = async (req, res, next) => {
  try {
    sendSuccess(res, await reviewService.setHidden(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};
