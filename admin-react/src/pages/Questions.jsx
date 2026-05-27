import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { questionsAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

function Questions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toasts, removeToast, success, error } = useToast();
  const { canDelete } = useAuth();

  const [formData, setFormData] = useState({
    text: '',
    type: 'rating',
    options: ['', '', '', '', '']  // 5 options/criteria fields
  });

  useEffect(() => {
    fetchQuestions();
  }, [page]);

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
      const response = await questionsAPI.getAll(page, 20);
      console.log('Questions API Response:', response);
      const questionData = response.data?.data?.data || response.data?.data || [];
      console.log('Question Data:', questionData);
      setQuestions(Array.isArray(questionData) ? questionData : []);
      setTotal(response.data?.data?.pagination?.total || 0);
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

  const handleDelete = async (id) => {
    if (!canDelete()) {
      error('You do not have permission to delete questions');
      return;
    }
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await questionsAPI.delete(id);
        success('Question deleted successfully');
        fetchQuestions();
      } catch (err) {
        if (err.response?.status === 403) {
          error('You do not have permission to delete questions');
        } else {
          error(err.response?.data?.message || 'Failed to delete question');
        }
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
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Updated By</TableHead>
                <TableHead>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {questions.map((q) => {
                const displayText = (q.text || q.question_text || '').substring(0, 50);
                const fullText = q.text || q.question_text || '';
                return (
                  <TableRow key={q._id || q.id}>
                    <TableCell>{displayText + (fullText.length > 50 ? '...' : '')}</TableCell>
                    <TableCell><Badge>{q.type || 'rating'}</Badge></TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{q.updated_by || 'system'}</div>
                        {q.updated_at && (
                          <div className="text-xs text-gray-500">
                            {new Date(q.updated_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => handleEdit(q)}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {canDelete() && (
                          <button
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-150"
                            onClick={() => handleDelete(q._id || q.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-4 mt-6">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold text-gray-900">{page}</span> of <span className="font-semibold text-gray-900">{Math.ceil(total / 20) || 1}</span> ({total} total)
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
