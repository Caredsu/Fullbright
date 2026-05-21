import { AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import '../styles/DraftRecovery.css';

export default function DraftRecovery({ draft, onRestore, onClear }) {
  if (!draft) return null;

  return (
    <div className="draft-recovery-banner">
      <div className="draft-recovery-content">
        <AlertCircle className="draft-recovery-icon" size={20} aria-hidden="true" />
        <div className="draft-recovery-text">
          <p className="draft-recovery-title">Incomplete Evaluation Saved</p>
          <p className="draft-recovery-info">
            You have an unsaved evaluation for <strong>{draft.teacherName}</strong>
            {draft.progress && ` - ${draft.progress}% complete`}
          </p>
        </div>
      </div>
      <div className="draft-recovery-actions">
        <button
          onClick={onRestore}
          className="draft-recovery-btn restore"
          title="Restore your draft evaluation"
          aria-label={`Restore draft for ${draft.teacherName}`}
        >
          <RotateCcw size={16} aria-hidden="true" />
          <span>Restore</span>
        </button>
        <button
          onClick={onClear}
          className="draft-recovery-btn discard"
          title="Discard draft"
          aria-label="Discard draft"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>Discard</span>
        </button>
      </div>
    </div>
  );
}
