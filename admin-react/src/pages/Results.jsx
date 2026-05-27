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
import { ChevronDown, Eye, PrinterIcon } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const { toasts, removeToast, error } = useToast();
  const itemsPerPage = 10;
  
  // Filter states
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  useEffect(() => {
    fetchQuestions();
    fetchEvaluations();
    fetchTeachers();
  }, [filterTeacher, filterFromDate, filterToDate]);

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
    // Handle answers as object: { question_id: rating }
    const answers = evaluation.answers;
    if (!answers || typeof answers !== 'object') return 0;
    
    const ratings = Object.values(answers)
      .filter(rating => rating !== null && rating !== undefined)
      .map(rating => parseFloat(rating) || 0);
    
    if (ratings.length === 0) return 0;
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

  const groupEvaluationsBySet = (evaluation) => {
    const setGroups = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const setAverages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    if (evaluation.answers && typeof evaluation.answers === 'object') {
      Object.entries(evaluation.answers).forEach(([questionId, rating]) => {
        const question = questions.find(q => q.id === questionId);
        const setNum = question?.set_number || 1;
        if (setGroups[setNum]) {
          setGroups[setNum].push({ questionId, rating, question });
        }
      });
      
      // Calculate averages for each set
      Object.keys(setGroups).forEach(setNum => {
        if (setGroups[setNum].length > 0) {
          const sum = setGroups[setNum].reduce((acc, item) => acc + (item.rating || 0), 0);
          setAverages[setNum] = Math.round((sum / setGroups[setNum].length) * 10) / 10;
        }
      });
    }
    
    return { setGroups, setAverages };
  };

  const clearFilters = () => {
    setFilterTeacher('');
    setFilterFromDate('');
    setFilterToDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterTeacher || filterFromDate || filterToDate;

  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      return `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim();
    }
    return 'Unknown Teacher';
  };

  // Pagination logic
  const totalPages = Math.ceil(evaluations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvaluations = evaluations.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const printOverallResults = () => {
    if (!filterTeacher) {
      alert('Please select a teacher to print results');
      return;
    }

    const teacher = teachers.find(t => t.id === filterTeacher);
    if (!teacher) return;

    // Calculate statistics for the selected teacher
    const teacherEvaluations = evaluations;
    const totalEvaluations = teacherEvaluations.length;
    
    if (totalEvaluations === 0) {
      alert('No evaluations found for this teacher');
      return;
    }

    const ratings = teacherEvaluations.map(e => calculateAverageRating(e));
    const averageRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 
      : 0;
    const maxRating = Math.max(...ratings);
    const minRating = Math.min(...ratings);

    // Calculate rating distribution
    const excellent = ratings.filter(r => r >= 4.5).length;
    const veryGood = ratings.filter(r => r >= 4 && r < 4.5).length;
    const good = ratings.filter(r => r >= 3 && r < 4).length;
    const needsImprovement = ratings.filter(r => r >= 2 && r < 3).length;
    const poor = ratings.filter(r => r < 2).length;

    // Collect all feedback comments
    const feedbackComments = teacherEvaluations
      .filter(e => e.positive_feedback || e.negative_feedback)
      .map(e => ({
        positiveFeedback: e.positive_feedback,
        negativeFeedback: e.negative_feedback
      }));

    const printWindow = window.open('', 'PrintResults', 'height=700,width=900');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Evaluation Results - ${teacher.first_name} ${teacher.last_name}</title>
          <style>
            * { margin: 0; padding: 0; }
            body { 
              font-family: Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .header {
              border-bottom: 3px solid #667eea;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .teacher-name {
              font-size: 28px;
              font-weight: bold;
              color: #1e293b;
              margin-bottom: 10px;
            }
            .print-date {
              color: #64748b;
              font-size: 12px;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              border-left: 4px solid #667eea;
              padding-left: 12px;
              margin-bottom: 15px;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .stat-box {
              background: #f1f5f9;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            .stat-label {
              color: #64748b;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .stat-value {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
            }
            .rating-distribution {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
              gap: 10px;
              margin-top: 15px;
            }
            .rating-item {
              text-align: center;
              padding: 10px;
              background: #f8fafc;
              border-radius: 6px;
            }
            .rating-label {
              font-size: 11px;
              color: #64748b;
              margin-bottom: 5px;
            }
            .rating-count {
              font-size: 18px;
              font-weight: bold;
              color: #1e293b;
            }
            .feedback-container {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .feedback-item {
              page-break-inside: avoid;
              margin-bottom: 15px;
            }
            .positive-feedback {
              background: #f0fdf4;
              border-left: 4px solid #16a34a;
              padding: 12px;
              border-radius: 4px;
            }
            .negative-feedback {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 12px;
              border-radius: 4px;
            }
            .feedback-label {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 8px;
            }
            .positive-feedback .feedback-label {
              color: #16a34a;
            }
            .negative-feedback .feedback-label {
              color: #ef4444;
            }
            .feedback-text {
              font-size: 12px;
              color: #333;
              line-height: 1.4;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #e2e8f0;
              padding-top: 15px;
              text-align: center;
              color: #64748b;
              font-size: 11px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="teacher-name">📊 Overall Evaluation Results</div>
            <div class="teacher-name" style="font-size: 24px; color: #667eea; margin-top: 10px;">
              ${teacher.first_name} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name}
            </div>
            <div class="print-date">Printed on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="section">
            <div class="section-title">📈 Summary Statistics</div>
            <div class="stats-grid">
              <div class="stat-box">
                <div class="stat-label">Total Evaluations</div>
                <div class="stat-value">${totalEvaluations}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Average Rating</div>
                <div class="stat-value">⭐ ${averageRating}/5</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Highest Rating</div>
                <div class="stat-value">⭐ ${maxRating}/5</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">Lowest Rating</div>
                <div class="stat-value">⭐ ${minRating}/5</div>
              </div>
            </div>

            <div class="section-title" style="margin-top: 20px;">📊 Rating Distribution</div>
            <div class="rating-distribution">
              <div class="rating-item">
                <div class="rating-label">Excellent (4.5+)</div>
                <div class="rating-count">${excellent}</div>
              </div>
              <div class="rating-item">
                <div class="rating-label">Very Good (4+)</div>
                <div class="rating-count">${veryGood}</div>
              </div>
              <div class="rating-item">
                <div class="rating-label">Good (3+)</div>
                <div class="rating-count">${good}</div>
              </div>
              <div class="rating-item">
                <div class="rating-label">Needs Imp. (2+)</div>
                <div class="rating-count">${needsImprovement}</div>
              </div>
              <div class="rating-item">
                <div class="rating-label">Poor (&lt;2)</div>
                <div class="rating-count">${poor}</div>
              </div>
            </div>
          </div>

          ${feedbackComments.length > 0 ? `
            <div class="section">
              <div class="section-title">💬 Student Feedback</div>
              <div class="feedback-container">
                ${feedbackComments.map((feedback, idx) => `
                  <div style="page-break-inside: avoid;">
                    ${feedback.positiveFeedback ? `
                      <div class="feedback-item positive-feedback">
                        <div class="feedback-label">✓ Positive Feedback ${idx + 1}</div>
                        <div class="feedback-text">${feedback.positiveFeedback}</div>
                      </div>
                    ` : ''}
                    ${feedback.negativeFeedback ? `
                      <div class="feedback-item negative-feedback">
                        <div class="feedback-label">✗ Areas for Improvement ${idx + 1}</div>
                        <div class="feedback-text">${feedback.negativeFeedback}</div>
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <p>This report was automatically generated from the Teacher Evaluation System.</p>
            <p>For questions about these results, please contact the administration.</p>
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="
              padding: 12px 30px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: bold;
            ">🖨️ Print or Save as PDF</button>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                </div>
                <div className="flex gap-2">
                  {filterTeacher && (
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={printOverallResults}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <PrinterIcon size={14} className="mr-2" />
                      Print Overall Results
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Table */}
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Evaluation #</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {paginatedEvaluations.map((row, idx) => {
                  const avgRating = calculateAverageRating(row);
                  const qualitative = getQualitativeAssessment(avgRating);
                  return (
                    <TableRow 
                      key={row._id || row.id}
                      onClick={() => handleViewDetails(row)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="font-medium">#{startIndex + idx + 1}</TableCell>
                      <TableCell>{getTeacherName(row.teacher_id)}</TableCell>
                      <TableCell>{row.student_id || 'N/A'}</TableCell>
                      <TableCell>{new Date(row.submitted_at || row.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge 
                          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)' }}
                          className="text-white"
                        >
                          ⭐ {avgRating}/5
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          style={{ background: qualitative.color }}
                          className="text-white"
                        >
                          {qualitative.text}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {evaluations.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No evaluations found. Try adjusting your filters.
            </div>
          )}

          {/* Pagination Controls */}
          {evaluations.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, evaluations.length)} of {evaluations.length} evaluations
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-4 py-2 bg-slate-100 rounded">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
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

              <h4 className="font-semibold text-lg mb-3">📊 Ratings Breakdown by Set</h4>
              <div className="space-y-6">
                {(() => {
                  const { setGroups, setAverages } = groupEvaluationsBySet(selectedEval);
                  
                  // Display Sets 1-4 with ratings
                  return (
                    <>
                      {[1, 2, 3, 4].map(setNum => (
                        setGroups[setNum] && setGroups[setNum].length > 0 && (
                          <div key={setNum} className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-4 rounded-r-md">
                            <h5 className="font-semibold text-lg mb-3 text-blue-900">
                              Set {setNum}: Rating Questions
                              <Badge className="ml-2 bg-blue-600 text-white font-bold">
                                ⭐ {setAverages[setNum]}/5
                              </Badge>
                            </h5>
                            <div className="space-y-2">
                              {setGroups[setNum].map(({ questionId, rating }, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-md border border-blue-200">
                                  <span className="text-sm flex-1">
                                    {getQuestionText(questionId) || 'Unknown Question'}
                                  </span>
                                  <Badge 
                                    style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)' }}
                                    className="text-white font-semibold ml-4"
                                  >
                                    {rating || 'N/A'} / 5
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </>
                  );
                })()}
              </div>

              <hr className="my-6" />

              <h4 className="font-semibold text-lg mb-3">💬 Set 5: Student Feedback (Optional)</h4>
              {selectedEval.positive_feedback || selectedEval.negative_feedback ? (
                <div className="space-y-4 max-h-48 overflow-y-auto">
                  {selectedEval.positive_feedback && (
                    <div>
                      <div className="font-semibold text-green-700 mb-2 flex items-center">
                        <span className="text-lg mr-2">✓</span> Positive Feedback
                      </div>
                      <div className="bg-green-50 text-slate-800 p-4 rounded-md border-l-4 border-green-600 whitespace-pre-wrap">
                        {selectedEval.positive_feedback}
                      </div>
                    </div>
                  )}
                  {selectedEval.negative_feedback && (
                    <div>
                      <div className="font-semibold text-red-700 mb-2 flex items-center">
                        <span className="text-lg mr-2">✗</span> Areas for Improvement
                      </div>
                      <div className="bg-red-50 text-slate-800 p-4 rounded-md border-l-4 border-red-600 whitespace-pre-wrap">
                        {selectedEval.negative_feedback}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-md border-l-4 border-slate-400 text-muted-foreground text-center">
                  ℹ️ No feedback provided for this evaluation
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
