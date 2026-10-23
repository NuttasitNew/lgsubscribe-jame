// Define a TypeScript type for the response pattern
export type ResponsePatternType<T = any> = {
  status: "ok" | "notFound" | "error" | "unauthorized" | "forbidden" | "validationError" | "Bad Request";
  message: string;
  data: T;
};

// ResponsePatternType utility functions
export const ResponsePattern = {
  ok: <T = any>(message = "Success", data: T): ResponsePatternType<T> => {
    if (data === null) {
      throw new Error("ResponsePattern.ok data must not be null"); // Ensure data is not null
    }
    return {
      status: "ok",
      message,
      data,
    };
  },

  notFound: <T = any>(message = "Resource not found", data: any = null): ResponsePatternType<T> => ({
    status: "notFound",
    message,
    data,
  }),

  badRequest: <T = any>(message = "Bad Request", data: any = null): ResponsePatternType<T> => ({
    status: "Bad Request",
    message,
    data,
  }),

  error: <T = any>(message = "An error occurred", data: any = null): ResponsePatternType<T> => ({
    status: "error",
    message,
    data,
  }),

  unauthorized: <T = any>(message = "Unauthorized access", data: any = null): ResponsePatternType<T> => ({
    status: "unauthorized",
    message,
    data,
  }),

  forbidden: <T = any>(message = "Forbidden", data: any = null): ResponsePatternType<T> => ({
    status: "forbidden",
    message,
    data,
  }),

  validationError: <T = any>(message = "Validation failed", data: any = null): ResponsePatternType<T> => ({
    status: "validationError",
    message,
    data,
  }),

  // custom: <T = any>(status: string, message: string, data: any = null): ResponsePatternType<T> => ({
  //   status,
  //   message,
  //   data,
  // }),
};
