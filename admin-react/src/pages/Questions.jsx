import React, { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { questionsAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import DataTable from '../components/DataTable';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';

function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, success, error } = useToast();

  const [formData, setFormData] = useState({
    text: '',
    type: 'rating',
    options: ['', '', '', '', '']  // 5 options/criteria fields
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (editingQuestion) {
      setFormData({
        text: editingQuestion.text || editingQuestion.question_text || '',
        type: editingQuestion.type || editingQuestion.question_type || 'rating',
        options: editingQuestion.options || editingQuestion.criteria || ['', '', '', '', '']
      });
    } else {
      setFormData({
        text: '',
        type: 'rating',
        options: ['', '', '', '', '']
      });
    }
  }, [editingQuestion, showModal]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      // Load all questions for client-side pagination
      const response = await questionsAPI.getAll(1, 1000);
      console.log('Questions API Response:', response);
      const questionData = response.data?.data?.data || response.data?.data || [];
      console.log('Question Data:', questionData);
      setQuestions(Array.isArray(questionData) ? questionData : []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      error(err.response?.data?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await questionsAPI.delete(questionId);
        success('Question deleted successfully');
        fetchQuestions();
      } catch (err) {
        error(err.response?.data?.message || 'Failed to delete question');
      }
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleOptionsChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const handleSubmit = async () => {
    setFormErrors({});
    
    // Validate required fields
    if (!formData.text.trim()) {
      setFormErrors({ text: 'Question text is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        text: formData.text,
        type: formData.type,
        options: formData.options.filter(o => o.trim())
      };

      if (editingQuestion) {
        await questionsAPI.update(editingQuestion.id, dataToSubmit);
        success('Question updated successfully');
      } else {
        await questionsAPI.create(dataToSubmit);
        success('Question created successfully');
      }

      setShowModal(false);
      setEditingQuestion(null);
      setFormData({
        text: '',
        type: 'rating',
        options: ['', '', '', '', '']
      });
      fetchQuestions();
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
      } else {
        error(err.response?.data?.message || 'Failed to save question');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Questions Management</h2>
        <Button
          onClick={() => {
            setEditingQuestion(null);
            setFormData({
              text: '',
              type: 'rating',
              options: ['', '', '', '', '']
            });
            setFormErrors({});
            setShowModal(true);
          }}
        >
          + Add New Question
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'text',
                label: 'Question',
                render: (row) => {
                  const displayText = (row.text || row.question_text || '').substring(0, 50);
                  const fullText = row.text || row.question_text || '';
                  return displayText + (fullText.length > 50 ? '...' : '');
                },
              },
              {
                key: 'type',
                label: 'Type',
                render: (row) => <Badge>{row.type || 'rating'}</Badge>,
              },
            ]}
            data={questions}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchableFields={['text', 'type']}
          />
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Question Text *</Label>
              <Textarea
                value={formData.text}
                onChange={(e) => handleFormChange('text', e.target.value)}
                placeholder="Enter your question here..."
                rows={3}
              />
              {formErrors.text && (
                <div className="text-red-600 text-sm mt-1">{formErrors.text}</div>
              )}
            </div>

            <div>
              <Label>Rating Scale (1-5) <span className="text-muted-foreground text-sm">(optional labels)</span></Label>
              <div className="border p-3 rounded-lg bg-slate-50 space-y-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="flex gap-2 items-center">
                    <span className="w-10 font-semibold text-sm">{num}</span>
                    <Input
                      type="text"
                      placeholder={`e.g., ${num === 1 ? 'Strongly Disagree' : num === 5 ? 'Strongly Agree' : 'Neutral'}`}
                      value={formData.options[num - 1] || ''}
                      onChange={(e) => handleOptionsChange(num - 1, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <small className="text-muted-foreground text-sm block mt-2">
                Leave blank for default numeric scale (1, 2, 3, 4, 5)
              </small>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : editingQuestion ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Questions;
