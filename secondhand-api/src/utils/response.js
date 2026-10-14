export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({ success: true, data });
};

export const sendCreated = (res, data) => {
  sendSuccess(res, data, 201);
};

export const sendNoContent = (res) => {
  res.status(204).send();
};
