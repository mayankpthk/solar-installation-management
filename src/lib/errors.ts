// Centralized Application Errors & RFC 7807 Problem Details

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toProblemDetails(instanceUri?: string) {
    return {
      type: `https://solaros.sunpower.com/errors/${this.code.toLowerCase().replace(/_/g, "-")}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      code: this.code,
      instance: instanceUri || "/api",
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "VALIDATION_FAILED", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required to perform this action") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You lack permissions to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      identifier ? `${resource} with ID '${identifier}' was not found` : `${resource} was not found`,
      404,
      "NOT_FOUND"
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = "RESOURCE_CONFLICT") {
    super(message, 409, code);
  }
}

export class UnapprovedSurveyError extends AppError {
  constructor(surveyId: string, currentStatus: string) {
    super(
      `Quotation blocked: Site survey '${surveyId}' is currently '${currentStatus}'. Quotations require an 'APPROVED' survey.`,
      422,
      "SURVEY_NOT_APPROVED",
      { surveyId, currentStatus, requiredStatus: "APPROVED" }
    );
  }
}

export class DoubleDispatchError extends AppError {
  constructor(serialNumber: string) {
    super(
      `Hardware conflict: Serial number '${serialNumber}' is already reserved or dispatched to another order.`,
      409,
      "SERIAL_ALREADY_DISPATCHED",
      { serialNumber }
    );
  }
}
