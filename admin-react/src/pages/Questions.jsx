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
  const [selectedSet, setSelectedSet] = useState(null);
  const { toasts, removeToast, success, error } = useToast();
  const { canDelete } = useAuth();

  const [formData, setFormData] = useState({
    text: '',
    type: 'rating',
    set_number: null,
    options: ['', '', '', '', ''],  // 5 options/criteria fields
    choice_descriptions: { 1: '', 2: '', 3: '', 4: '', 5: '' }  // Descriptions for each choice
  });

  useEffect(() => {
    fetchQuestions();
  }, [page, selectedSet]);

  useEffect(() => {
    if (editingQuestion) {
      setFormData({
        text: editingQuestion.text || editingQuestion.question_text || '',
        type: editingQuestion.type || editingQuestion.question_type || 'rating',
        set_number: editingQuestion.set_number || null,
        options: editingQuestion.options || editingQuestion.criteria || ['', '', '', '', ''],
        choice_descriptions: editingQuestion.choice_descriptions || { 1: '', 2: '', 3: '', 4: '', 5: '' }
      });
    } else {
      setFormData({
        text: '',
        type: 'rating',
        set_number: null,
        options: ['', '', '', '', ''],
        choice_descriptions: { 1: '', 2: '', 3: '', 4: '', 5: '' }
      });
    }
  }, [editingQuestion, showModal]);

  const fetchQuestions = async () => {
    setLoading(true);
    setQuestions([]); // Clear questions immediately to prevent old data from showing
    try {
      const params = selectedSet !== null ? { set_number: selectedSet } : {};
      console.log('Fetching questions with params:', { page, selectedSet, params });
      const response = await questionsAPI.getAll(page, 20, params);
      console.log('Questions API Response:', response);
      const questionData = response.data?.data?.data || response.data?.data || [];
      console.log('Question Data after fetch:', questionData, 'Length:', questionData.length, 'Filter set:', selectedSet);
      
      // Double-check that results match the filter
      const processedQuestions = Array.isArray(questionData) ? questionData : [];
      
      // If filtering by a set, verify the results are actually from that set
      if (selectedSet !== null) {
        const filteredByClient = processedQuestions.filter(q => q.set_number === selectedSet);
        if (filteredByClient.length < processedQuestions.length) {
          console.warn(`⚠️ Backend returned ${processedQuestions.length} questions but only ${filteredByClient.length} match Set ${selectedSet}. Using client-side filtering as fallback.`);
          setQuestions(filteredByClient);
        } else {
          setQuestions(processedQuestions);
        }
      } else {
        setQuestions(processedQuestions);
      }
      
      setTotal(response.data?.data?.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching questions:', err);
      error(err.response?.data?.message || 'Failed to load questions');
      setQuestions([]);
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
    console.log(`🔄 handleFormChange: ${field} = ${value} (was ${formData[field]})`);
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

  const handleChoiceDescriptionChange = (choiceNum, value) => {
    setFormData(prev => ({
      ...prev,
      choice_descriptions: {
        ...prev.choice_descriptions,
        [choiceNum]: value
      }
    }));
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

    if (!formData.set_number) {
      setFormErrors({ set_number: 'Question set is required' });
      return;
    }

    // Validate choice_descriptions for rating questions (Sets 1-4)
    if (formData.set_number <= 4) {
      const hasAnyDescription = Object.values(formData.choice_descriptions || {})
        .some(desc => desc && desc.trim());
      
      if (!hasAnyDescription) {
        setFormErrors({ 
          choice_descriptions: 'At least one rating description is required for rating questions'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit = {
        text: formData.text,
        type: formData.type,
        set_number: formData.set_number,
        options: formData.options.filter(o => o.trim()),
        choice_descriptions: formData.choice_descriptions
      };
      
      console.log('📝 Submitting question with dataToSubmit:', dataToSubmit);

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
        set_number: null,
        options: ['', '', '', '', ''],
        choice_descriptions: { 1: '', 2: '', 3: '', 4: '', 5: '' }
      });
      setPage(1); // Reset to page 1 after creating/updating
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
              set_number: null,
              options: ['', '', '', '', ''],
              choice_descriptions: { 1: '', 2: '', 3: '', 4: '', 5: '' }
            });
            setFormErrors({});
            setShowModal(true);
          }}
        >
          + Add New Question
        </Button>
      </div>

      {/* Set Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={selectedSet === null ? 'default' : 'outline'}
          onClick={() => {
            setSelectedSet(null);
            setPage(1);
          }}
          size="sm"
        >
          All Sets
        </Button>
        {[1, 2, 3, 4].map(setNum => (
          <Button
            key={setNum}
            variant={selectedSet === setNum ? 'default' : 'outline'}
            onClick={() => {
              setSelectedSet(setNum);
              setPage(1);
            }}
            size="sm"
          >
            Set {setNum} (Rating)
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Set</TableHead>
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
                    <TableCell>
                      <Badge variant={q.set_number <= 4 ? 'secondary' : 'default'}>
                        Set {q.set_number}
                      </Badge>
                    </TableCell>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Question Set Selector */}
            <div>
              <Label>Question Set *</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {[1, 2, 3, 4].map(setNum => (
                  <Button
                    key={setNum}
                    variant={formData.set_number === setNum ? 'default' : 'outline'}
                    onClick={() => handleFormChange('set_number', setNum)}
                    className="w-full"
                  >
                    Set {setNum}
                  </Button>
                ))}
              </div>
              {formErrors.set_number && (
                <div className="text-red-600 text-sm mt-1">{formErrors.set_number}</div>
              )}
            </div>

            {/* Question Text - only show after set is selected */}
            {formData.set_number && (
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
            )}

            {/* Choice Descriptions (only for Sets 1-4) */}
            {formData.set_number && formData.set_number <= 4 && (
              <div>
                <Label>Choice Descriptions (1-5 Scale) <span className="text-red-600">*</span></Label>
                <div className="border p-4 rounded-lg bg-slate-50 space-y-3 max-h-96 overflow-y-auto">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-8 font-semibold text-sm bg-blue-100 px-2 py-1 rounded text-center">{num}</span>
                        <Label className="flex-1 text-sm">
                          Description for rating {num}
                        </Label>
                      </div>
                      <Input
                        type="text"
                        placeholder={`e.g., ${num === 1 ? 'Strongly Disagree' : num === 5 ? 'Strongly Agree' : 'Neutral'}`}
                        value={formData.choice_descriptions[num] || ''}
                        onChange={(e) => handleChoiceDescriptionChange(num, e.target.value)}
                        className="ml-10"
                      />
                    </div>
                  ))}
                </div>
                <small className="text-muted-foreground text-sm block mt-2">
                  At least one description is required for rating questions
                </small>
                {formErrors.choice_descriptions && (
                  <div className="text-red-600 text-sm mt-2">{formErrors.choice_descriptions}</div>
                )}
              </div>
            )}

            {/* Set 5 Info */}
            {formData.set_number === 5 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Set 5:</strong> This is for positive and negative feedback. Students will provide text feedback instead of numeric ratings.
                </p>
              </div>
            )}
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
                disabled={isSubmitting || !formData.set_number}
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
