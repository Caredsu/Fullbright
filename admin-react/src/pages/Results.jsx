import React, { useState, useEffect } from 'react';
import { evaluationsAPI, teachersAPI, questionsAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ChevronDown, Eye } from 'lucide-react';
import DataTable from '../components/DataTable';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';

function Results() {
  const [evaluations, setEvaluations] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsMap, setQuestionsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toasts, removeToast, error } = useToast();
  
  // Filter states
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterMinRating, setFilterMinRating] = useState('');

  useEffect(() => {
    fetchQuestions();
    fetchEvaluations();
    fetchTeachers();
  }, [filterTeacher, filterFromDate, filterToDate, filterMinRating]);

  const fetchTeachers = async () => {
    try {
      const response = await teachersAPI.getAll(1, 100);
      const teacherData = response.data?.data?.data || response.data?.data || [];
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await questionsAPI.getAll(1, 100);
      const questionData = response.data?.data?.data || response.data?.data || [];
      const processedQuestions = Array.isArray(questionData) ? questionData : [];
      setQuestions(processedQuestions);
      
      // Create a map for O(1) lookups
      const map = {};
      processedQuestions.forEach(q => {
        map[q.id] = q.question_text;
      });
      setQuestionsMap(map);
    } catch (err) {
      console.error('Error fetching questions:', err);
    }
  };

  const getQuestionText = (questionId) => {
    // Use the map for faster lookup
    if (questionsMap[questionId]) {
      return questionsMap[questionId];
    }
    // Fallback to array search (shouldn't be needed if map is working)
    const question = questions.find(q => q.id === questionId);
    return question ? question.question_text : 'Unknown Question';
  };

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      // Load all evaluations for client-side pagination and filtering
      const response = await evaluationsAPI.getAll(1, 1000);
      const data = response.data?.data?.data || response.data?.data || [];
      let filteredData = Array.isArray(data) ? data : [];

      // Apply filters
      if (filterTeacher) {
        filteredData = filteredData.filter(e => e.teacher_id === filterTeacher);
      }

      if (filterMinRating) {
        filteredData = filteredData.filter(e => {
          const avg = calculateAverageRating(e);
          return avg >= parseFloat(filterMinRating);
        });
      }

      if (filterFromDate || filterToDate) {
        filteredData = filteredData.filter(e => {
          const evalDate = new Date(e.submitted_at || e.created_at);
          if (filterFromDate) {
            const fromDate = new Date(filterFromDate);
            if (evalDate < fromDate) return false;
          }
          if (filterToDate) {
            const toDate = new Date(filterToDate);
            toDate.setHours(23, 59, 59, 999);
            if (evalDate > toDate) return false;
          }
          return true;
        });
      }

      setEvaluations(filteredData);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load evaluations');
      setEvaluations([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = (evaluation) => {
    if (!evaluation.answers || evaluation.answers.length === 0) return 0;
    const ratings = evaluation.answers.map(a => a.rating || 0);
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  };

  const getQualitativeAssessment = (rating) => {
    if (rating >= 4.5) return { text: 'Excellent', color: '#16a34a', description: 'Outstanding performance' };
    if (rating >= 4) return { text: 'Very Good', color: '#10b981', description: 'Consistently strong performance' };
    if (rating >= 3) return { text: 'Good', color: '#3b82f6', description: 'Satisfactory performance' };
    if (rating >= 2) return { text: 'Needs Improvement', color: '#f59e0b', description: 'Room for improvement' };
    return { text: 'Poor', color: '#ef4444', description: 'Requires immediate attention' };
  };

  const handleViewDetails = (evaluation) => {
    setSelectedEval(evaluation);
    setShowModal(true);
  };

  const clearFilters = () => {
    setFilterTeacher('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterMinRating('');
  };

  const hasActiveFilters = filterTeacher || filterFromDate || filterToDate || filterMinRating;

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      return `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim();
    }
    return 'Unknown Teacher';
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Evaluation Results</h2>
        <p className="text-muted-foreground text-sm mt-1">View and analyze evaluation results</p>
      </div>

      <Card>
        {/* Collapsible Filters Header */}
        <div 
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">🔍</span>
            <span className="font-semibold text-slate-700">Advanced Filters</span>
          </div>
          <ChevronDown 
            size={20} 
            className={`text-slate-600 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <div className="p-6 bg-slate-50 border-b border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="mb-2">Teacher</Label>
                <select 
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                >
                  <option value="">All Teachers</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.middle_name || ''} {t.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="mb-2">From Date</Label>
                <Input 
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="mb-2">To Date</Label>
                <Input 
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="mb-2">Minimum Rating</Label>
                <select 
                  value={filterMinRating}
                  onChange={(e) => setFilterMinRating(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-sm"
                >
                  <option value="">All</option>
                  <option value="1">1+ ⭐</option>
                  <option value="2">2+ ⭐</option>
                  <option value="3">3+ ⭐</option>
                  <option value="4">4+ ⭐</option>
                  <option value="5">5 ⭐</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-300">
                <div className="flex flex-wrap gap-2">
                  {filterTeacher && (
                    <Badge variant="default">
                      👨‍🏫 {getTeacherName(filterTeacher)}
                    </Badge>
                  )}
                  {filterFromDate && (
                    <Badge variant="secondary">📅 {filterFromDate}</Badge>
                  )}
                  {filterToDate && (
                    <Badge variant="secondary">📅 {filterToDate}</Badge>
                  )}
                  {filterMinRating && (
                    <Badge variant="outline">⭐ {filterMinRating}+</Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <CardContent className="p-4">
          <DataTable
            columns={[
              {
                key: 'teacher_id',
                label: 'Teacher',
                render: (row) => getTeacherName(row.teacher_id),
              },
              {
                key: 'submitted_at',
                label: 'Submitted Date',
                render: (row) => new Date(row.submitted_at || row.created_at).toLocaleDateString(),
              },
              {
                key: 'rating',
                label: 'Avg Rating',
                render: (row) => {
                  const avgRating = calculateAverageRating(row);
                  const qualitative = getQualitativeAssessment(avgRating);
                  return (
                    <div className="flex flex-col gap-1">
                      <div 
                        className="inline-block px-2 py-1 rounded-full text-white text-xs font-bold text-center"
                        style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)', width: 'fit-content' }}
                      >
                        ⭐ {avgRating}/5
                      </div>
                      <Badge 
                        style={{ background: qualitative.color }}
                        className="inline-block text-white text-xs"
                      >
                        {qualitative.text}
                      </Badge>
                    </div>
                  );
                },
              },
              {
                key: 'responses',
                label: 'Responses',
                render: (row) => (
                  <Badge variant="secondary">{row.answers ? row.answers.length : 0}</Badge>
                ),
              },
            ]}
            data={evaluations}
            loading={loading}
            onView={handleViewDetails}
            searchableFields={['teacher_id', 'submitted_at']}
          />
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluation Details</DialogTitle>
          </DialogHeader>

          {selectedEval && (
            <div className="space-y-4">
              <div>
                <span className="font-semibold">Teacher:</span> {getTeacherName(selectedEval.teacher_id)}
              </div>

              {selectedEval.student_id && (
                <div>
                  <span className="font-semibold">Student Number:</span> {selectedEval.student_id}
                </div>
              )}

              <div>
                <span className="font-semibold">Submitted:</span> {new Date(selectedEval.submitted_at || selectedEval.created_at).toLocaleString()}
              </div>

              {(() => {
                const avgRating = calculateAverageRating(selectedEval);
                const qualitative = getQualitativeAssessment(avgRating);
                return (
                  <>
                    <div>
                      <span className="font-semibold">Overall Rating:</span>{' '}
                      <Badge 
                        style={{ background: qualitative.color }}
                        className="text-white"
                      >
                        ⭐ {avgRating}/5 - {qualitative.text}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground italic">
                      {qualitative.description}
                    </div>
                  </>
                );
              })()}

              <hr />

              <h4 className="font-semibold">Ratings by Question:</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Question</TableHead>
                      <TableHead>Rating</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {selectedEval.answers && selectedEval.answers.length > 0 ? (
                      selectedEval.answers.map((answer, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {answer.question_text || getQuestionText(answer.question_id) || 'Unknown Question'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)' }}
                              className="text-white"
                            >
                              {answer.rating || 'N/A'}/5
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No ratings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <hr />

              <h4 className="font-semibold">Qualitative Feedback:</h4>
              {selectedEval.positive_feedback || selectedEval.negative_feedback ? (
                <div className="space-y-3">
                  {selectedEval.positive_feedback && (
                    <div>
                      <div className="font-semibold text-green-600">✓ Positive Feedback:</div>
                      <div className="bg-green-50 text-slate-800 p-3 rounded-md border-l-4 border-green-600 mt-1">
                        {selectedEval.positive_feedback}
                      </div>
                    </div>
                  )}
                  {selectedEval.negative_feedback && (
                    <div>
                      <div className="font-semibold text-red-600">✗ Negative Feedback:</div>
                      <div className="bg-red-50 text-slate-800 p-3 rounded-md border-l-4 border-red-600 mt-1">
                        {selectedEval.negative_feedback}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-md border-l-4 border-purple-600">
                  {selectedEval.feedback || 'No feedback provided'}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Results;
