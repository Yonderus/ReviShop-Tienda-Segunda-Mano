import { Report } from "../models/report.model.js";

export const reportRepository = {
  create(data) {
    return Report.create(data);
  },
};
