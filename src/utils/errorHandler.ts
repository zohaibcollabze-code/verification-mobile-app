import { AppException } from './exceptions';

export class ErrorHandler {
  /**
   * Maps untyped errors/exceptions to a user-friendly message and logs them safely.
   * Ensures internal details are not exposed to the user.
   */
  static handle(error: any): { message: string; code: string } {
    if (error instanceof AppException) {
      return {
        message: this.getUserFriendlyMessage(error.code, error.message),
        code: error.code,
      };
    }

    // Handle Axios/Network errors
    if (error?.isAxiosError) {
      const responseData = error.response?.data;
      if (responseData && typeof responseData === 'object') {
        // If server followed Rule #7 even on error
        const message = responseData.error || responseData.message || error.message;
        const code = responseData.code || `HTTP_${error.response?.status || 'ERROR'}`;
        return {
          message: this.getUserFriendlyMessage(code, message),
          code,
        };
      }
      
      if (error.code === 'ECONNABORTED') {
        return { message: 'Request timed out.', code: 'TIMEOUT' };
      }
      if (!error.response) {
        return { message: 'Network error. Please check your connection.', code: 'NETWORK_ERROR' };
      }
    }

    // Default for unknown errors
    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
    };
  }

  static mapError(error: any): { message: string; code: string } {
    return this.handle(error);
  }

  private static getUserFriendlyMessage(code: string, originalMessage: string): string {
    const messages: Record<string, string> = {
      'INVALID_RESPONSE_SHAPE': 'The server returned an invalid response.',
      'NETWORK_ERROR': 'Check your internet connection.',
      'DESERIALIZATION_ERROR': 'Failed to process data.',
      'INVALID_GPS': 'GPS coordinates are outside Pakistan bounds.',
      'FORBIDDEN_ACTION': 'You do not have permission to perform this action.',
      'DEADLINE_EXPIRED': 'The response deadline for this job has passed.',
      'INVALID_STATUS': 'This job is no longer available or has already been processed.',
    };

    return messages[code] || originalMessage;
  }

  /**
   * Safe logging that redacts PII as per guide rule.
   */
  static logError(message: string, error?: any): void {
    const errorInfo = this.extractErrorInfo(error);
    const codeStr = errorInfo.code ? ` [${errorInfo.code}]` : '';
    
    console.error(`[AppError] ${message}${codeStr}: ${errorInfo.message}`, {
      ...errorInfo,
      stack: error?.stack,
    });
  }

  private static extractErrorInfo(error: any): { message: string; code: string; [key: string]: any } {
    if (!error) return { message: 'No error provided', code: 'NONE' };

    let info: any = {};
    
    if (error instanceof AppException) {
      info = { message: error.message, code: error.code };
    } else if (error?.isAxiosError) {
      info = {
        message: error.message,
        code: error.code || `HTTP_${error.response?.status}`,
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        responseData: this.redactPII(error.response?.data),
      };
    } else if (error instanceof Error) {
      info = { message: error.message, code: 'JS_ERROR', name: error.name };
    } else {
      info = { message: String(error), code: 'UNKNOWN' };
    }

    return info;
  }

  private static redactPII(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'email', 'phone', 'cnicNumber'];
    
    // Create a copy to redact
    const redacted = Array.isArray(data) ? [...data] : { ...data };
    
    // Recursive redaction for nested objects
    for (const key in redacted) {
      if (sensitiveFields.includes(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object') {
        redacted[key] = this.redactPII(redacted[key]);
      }
    }
    
    return redacted;
  }
}
