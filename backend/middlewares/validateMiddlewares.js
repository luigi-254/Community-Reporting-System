
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        // Format Zod errors
        const issues = result.error.issues || [];
        const errors = issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          status: 'error',
          message: issues[0]?.message || 'Validation failed',
          errors,
        });
      }

      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default {
  validate,
};
