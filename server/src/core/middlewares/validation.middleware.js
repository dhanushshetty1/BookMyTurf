import { ZodError } from 'zod';

export const validateRequest = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query;
    if (parsed.params !== undefined) req.params = parsed.params;
    
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || [];
      const errors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    next(error);
  }
};
