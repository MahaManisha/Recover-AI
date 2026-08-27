/**
 * RecoverAI Frontend Error Handling Utilities
 */

export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  CLIENT_ERROR: 'CLIENT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

const USER_MESSAGES = {
  [ERROR_TYPES.NETWORK_ERROR]: 'Unable to connect to the server. Please try again.',
  [ERROR_TYPES.SERVER_ERROR]: 'Something went wrong on the server. Please try again.',
  [ERROR_TYPES.CLIENT_ERROR]: 'Invalid request. Please check and try again.',
  [ERROR_TYPES.UNKNOWN_ERROR]: 'Something went wrong. Please try again.',
};

/**
 * Categorizes an error and returns a clean, user-friendly message.
 * Internal file paths, technical stack traces, or sensitive details are masked.
 */
export function formatErrorMessage(error) {
  if (!error) {
    return USER_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
  }

  // Network / Fetch failures (e.g. Failed to fetch, Connection refused)
  if (
    error.type === ERROR_TYPES.NETWORK_ERROR ||
    error.name === 'TypeError' ||
    (error.message && error.message.toLowerCase().includes('failed to fetch')) ||
    (error.message && error.message.toLowerCase().includes('networkerror'))
  ) {
    return USER_MESSAGES[ERROR_TYPES.NETWORK_ERROR];
  }

  // HTTP status based errors
  if (error.status) {
    if (error.status >= 500) {
      return USER_MESSAGES[ERROR_TYPES.SERVER_ERROR];
    }
    if (error.status >= 400 && error.status < 500) {
      return USER_MESSAGES[ERROR_TYPES.CLIENT_ERROR];
    }
  }

  if (error.type && USER_MESSAGES[error.type]) {
    return USER_MESSAGES[error.type];
  }

  return USER_MESSAGES[ERROR_TYPES.UNKNOWN_ERROR];
}
