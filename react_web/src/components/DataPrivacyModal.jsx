import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import '../styles/DataPrivacyModal.css';

export default function DataPrivacyModal({ onConsent }) {
  const [isChecked, setIsChecked] = useState(false);

  const handleConsent = () => {
    if (!isChecked) {
      return;
    }
    localStorage.setItem('data_privacy_consent', 'accepted');
    onConsent();
  };

  return (
    <div className="data-privacy-overlay">
      <div className="data-privacy-modal">
        <div className="data-privacy-header">
          <h2>Data Privacy Consent Form</h2>
          <p className="data-privacy-subtitle">FBC Evaluation System</p>
        </div>

        <div className="data-privacy-content">
          <div className="data-privacy-section">
            <h3>Purpose of Data Collection</h3>
            <p>
              The FBC Evaluation System is committed to protecting your privacy. This platform collects and processes student feedback for the sole purpose of evaluating teaching effectiveness and enhancing the quality of education.
            </p>
          </div>

          <div className="data-privacy-section">
            <h3>What Data We Collect</h3>
            <p>By participating in this evaluation, you consent to the collection of the following data:</p>
            <ul className="data-privacy-list">
              <li>Responses to evaluation questions</li>
              <li>Demographic information (if applicable)</li>
              <li>System usage data (e.g., time and date of submission)</li>
            </ul>
            <p className="data-privacy-note">All feedback is collected anonymously, unless otherwise stated.</p>
          </div>

          <div className="data-privacy-section">
            <h3>How We Use Your Data</h3>
            <p>The data collected will be used to:</p>
            <ul className="data-privacy-list">
              <li>Generate reports on teaching effectiveness</li>
              <li>Support teacher development and institutional improvement</li>
              <li>Maintain academic quality standards</li>
            </ul>
            <p className="data-privacy-note">All information is processed in a way that prevents identification of individual students.</p>
          </div>

          <div className="data-privacy-section">
            <h3>Data Storage and Security</h3>
            <p>
              Your data is securely stored and protected against unauthorized access, alteration, disclosure, or destruction. Access is limited to authorized personnel only.
            </p>
          </div>

          <div className="data-privacy-section">
            <h3>Consent</h3>
            <p>By checking the box below and submitting your evaluation, you acknowledge that:</p>
            <ul className="data-privacy-list">
              <li>You have read and understood this Data Privacy Consent Form</li>
              <li>You voluntarily agree to the collection and use of your data as described</li>
              <li>You understand that your responses will remain anonymous</li>
            </ul>
          </div>
        </div>

        <div className="data-privacy-footer">
          <label className="data-privacy-checkbox-label">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="data-privacy-checkbox"
            />
            <span className="checkbox-text">
              I consent to the collection and processing of my data for the purposes stated above.
            </span>
          </label>
          <p className="checkbox-required">* Required to proceed</p>

          <button
            onClick={handleConsent}
            disabled={!isChecked}
            className={`data-privacy-btn ${isChecked ? 'data-privacy-btn-enabled' : 'data-privacy-btn-disabled'}`}
          >
            I Accept & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
