/**
 * Extract error message from API response
 * Handles both string errors and Pydantic ValidationError arrays
 */
export const getErrorMessage = (error) => {
  if (!error) return 'An error occurred';
  
  const detail = error.response?.data?.detail;
  
  // Handle string error messages
  if (typeof detail === 'string') {
    return detail;
  }
  
  // Handle Pydantic validation error array
  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        if (typeof err === 'object' && err.msg) {
          return err.msg;
        }
        return String(err);
      })
      .join('; ');
  }
  
  // Handle object error
  if (typeof detail === 'object' && detail.msg) {
    return detail.msg;
  }
  
  // Fallback to error message
  return error.message || 'An error occurred';
};
