import { AlertCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/AlreadyEvaluatedModal.css';

export default function AlreadyEvaluatedModal({ teacher }) {
  const navigate = useNavigate();

  return (
    <div className="already-evaluated-overlay">
      <div className="already-evaluated-modal">
        <div className="modal-header">
          <AlertCircle size={32} className="warning-icon" />
          <h2>Already Evaluated</h2>
        </div>

        <div className="modal-body">
          <p className="teacher-name">{teacher?.name || 'This Teacher'}</p>
          <p className="message">
            You have already evaluated this teacher. 
            <strong> One evaluation per teacher per device.</strong>
          </p>
          <div className="info-box">
            <p>✓ Your evaluation has been recorded</p>
            <p>✓ You cannot submit another evaluation for this teacher from this device</p>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
          >
            <Home size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
