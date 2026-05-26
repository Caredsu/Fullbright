import React from 'react';
import { AlertCircle } from 'lucide-react';
import '../styles/modals.css';

export default function EvaluationsClosedModal() {
  return (
    <div className="modal-overlay">
      <div className="modal-content eval-closed-modal">
        <div className="modal-header">
          <AlertCircle size={32} className="modal-icon warning" />
          <h2>Evaluations Closed</h2>
        </div>
        
        <div className="modal-body">
          <p className="modal-message">
            Evaluations are currently <strong>disabled</strong> in the system.
          </p>
          <p className="modal-submessage">
            Students will not be able to submit evaluations on the web platform or mobile app until evaluations are re-enabled.
          </p>
        </div>

        <div className="modal-footer">
          <p className="modal-hint">
            Go to <strong>Settings</strong> to enable evaluations.
          </p>
        </div>
      </div>
    </div>
  );
}
