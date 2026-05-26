import { z } from 'zod';

// Student access - requires exactly 10 digits
export const studentAccessSchema = z.object({
  student_number: z
    .string()
    .min(1, 'Student Number is required')
    .refine(
      (value) => {
        const cleaned = value.replace(/\s+/g, '');
        
        // Must be exactly 10 digits
        if (!/^\d{10}$/.test(cleaned)) {
          return false;
        }
        
        // 10-digit format validation
        const schoolYear = cleaned.substring(0, 2);
        const semester = cleaned.substring(2, 4);
        const department = cleaned.substring(4, 6);
        
        const year = parseInt(schoolYear);
        if (year < 22 || year > 26) return false;
        if (semester !== '01' && semester !== '02') return false;
        if (department < '01' || department > '08') return false;
        
        return true;
      },
      {
        message: 'Student number must be exactly 10 digits (e.g., 2201010099)'
      }
    )
});

// Evaluation form validation
export const evaluationSchema = z.object({
  teacherId: z
    .number()
    .int('Teacher ID must be a valid number')
    .positive('Teacher ID must be positive'),
  ratings: z
    .object({
      communication: z.number().min(1).max(5),
      professionalism: z.number().min(1).max(5),
      preparation: z.number().min(1).max(5),
      engagement: z.number().min(1).max(5),
      assessment: z.number().min(1).max(5),
    })
    .refine(
      (data) => Object.values(data).every((v) => v >= 1 && v <= 5),
      'All ratings must be between 1 and 5'
    ),
  feedback: z
    .string()
    .max(500, 'Feedback must not exceed 500 characters')
    .optional(),
  anonymous: z.boolean().default(false),
});

/**
 * Utility to validate form data
 * @param {Object} data - Form data to validate
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Object} { valid: boolean, errors: Object, data: any }
 */
export const validateForm = (data, schema) => {
  try {
    const validatedData = schema.parse(data);
    return { valid: true, errors: {}, data: validatedData };
  } catch (error) {
    if (error.errors) {
      const errors = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors, data: null };
    }
    return { valid: false, errors: { general: 'Validation failed' }, data: null };
  }
};
