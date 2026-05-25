import React, { useState } from 'react';

function FormModal({ isOpen, title, fields, initialData, onSubmit, onClose, isLoading }) {
  const [formData, setFormData] = useState(initialData || {});
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData, setErrors);
  };

  if (!isOpen) return null;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              disabled={isLoading}
            ></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {fields.map((field) => (
                <div key={field.name} className="mb-3">
                  <label htmlFor={field.name} className="form-label">
                    {field.label} {field.required && <span className="text-danger">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className={`form-control ${errors[field.name] ? 'is-invalid' : ''}`}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      rows={field.rows || 3}
                    ></textarea>
                  ) : field.type === 'select' ? (
                    <select
                      className={`form-select ${errors[field.name] ? 'is-invalid' : ''}`}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className={`form-control ${errors[field.name] ? 'is-invalid' : ''}`}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      placeholder={field.placeholder}
                    />
                  )}
                  {errors[field.name] && (
                    <div className="invalid-feedback d-block">
                      {errors[field.name]}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FormModal;
