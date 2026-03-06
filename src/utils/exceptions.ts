export class AppException extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AppException';
    this.code = code;
  }
}

/**
 * API-specific error with HTTP status code and optional details.
 * Thrown by the API client when the server returns an error response.
 */
export class ApiError extends AppException {
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>,
  ) {
    super(message, code);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}
