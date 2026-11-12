/** An error whose message is safe to show to the end user. */
export class AppError extends Error {
  constructor(status, code, message, field = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export const validationError = (message, field) =>
  new AppError(400, 'VALIDATION_ERROR', message, field);
export const conflictError = (message, field) => new AppError(409, 'CONFLICT', message, field);
export const notFound = (message = 'Not found.') => new AppError(404, 'NOT_FOUND', message);
export const unauthorized = (message = 'Please log in to continue.') =>
  new AppError(401, 'UNAUTHORIZED', message);
