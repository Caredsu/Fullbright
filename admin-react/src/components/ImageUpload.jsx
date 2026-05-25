import React, { useState, useRef } from 'react';
import { Upload, X, Loader } from 'lucide-react';
import api from '../services/api';
import '../styles/imageUpload.css';

export default function ImageUpload({ value, onChange, onError }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('File size must be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await api.post('/upload/teacher-profile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const uploadedUrl = response.data.data.url;
        setPreview(uploadedUrl);
        onChange?.(uploadedUrl);
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    onChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">Profile Picture</label>
      
      {preview ? (
        <div className="image-preview">
          <img src={preview} alt="Preview" />
          <button
            type="button"
            className="remove-image-btn"
            onClick={handleClear}
            disabled={loading}
            title="Remove image"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div
          className={`upload-zone ${dragActive ? 'active' : ''} ${loading ? 'loading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {loading ? (
            <div className="upload-loading">
              <Loader size={28} className="spinner" />
              <p>Uploading...</p>
            </div>
          ) : (
            <>
              <Upload size={28} />
              <p className="upload-text">
                Drag and drop your image here
                <br />
                or click to browse
              </p>
              <span className="upload-hint">
                JPEG, PNG, GIF, or WebP (max 5MB)
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={loading}
        className="hidden-input"
      />
    </div>
  );
}
