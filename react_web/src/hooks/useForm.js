import { useState } from 'react';
import { validateForm } from '../schemas/validationSchemas';

/**
 * Custom hook for managing form state with validation
 * @param {Object} initialValues - Initial form values
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @param {Function} onSubmit - Callback when form is valid and submitted
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues, schema, onSubmit) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setErrors({});

    // Validate form data
    const validation = validateForm(values, schema);
    if (!validation.valid) {
      setErrors(validation.errors);
      // Mark all fields as touched to show errors
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched(allTouched);
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(validation.data);
    } catch (error) {
      setSubmitError(error.userMessage || error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError('');
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setErrors,
  };
};
