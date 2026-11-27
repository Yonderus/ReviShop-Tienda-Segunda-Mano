import { questionService } from "../services/question.service.js";
import { reportService } from "../services/report.service.js";
import { sendCreated, sendNoContent, sendSuccess } from "../utils/response.js";

export const getProductQuestions = async (req, res, next) => {
  try {
    sendSuccess(res, await questionService.listForProduct(req.params.slug, req.user ?? null));
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req, res, next) => {
  try {
    sendCreated(res, await questionService.ask(req.params.id, req.body.text, req.user));
  } catch (error) {
    next(error);
  }
};

export const answerQuestion = async (req, res, next) => {
  try {
    sendSuccess(res, await questionService.answer(req.params.id, req.body.text, req.user));
  } catch (error) {
    next(error);
  }
};

export const setQuestionHidden = async (req, res, next) => {
  try {
    sendSuccess(res, await questionService.setHidden(req.params.id, req.body.hidden, req.user, req.body.reason));
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    await questionService.remove(req.params.id, req.user);
    sendNoContent(res);
  } catch (error) {
    next(error);
  }
};

export const reportQuestion = async (req, res, next) => {
  try {
    sendCreated(res, await reportService.reportQuestion(req.params.id, req.body, req.user));
  } catch (error) {
    next(error);
  }
};

export const getMyUnansweredQuestions = async (req, res, next) => {
  try {
    sendSuccess(res, await questionService.unansweredFor(req.user));
  } catch (error) {
    next(error);
  }
};
