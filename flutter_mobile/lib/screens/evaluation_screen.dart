import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/draft_service.dart';
import '../services/toast_service.dart';
import '../services/evaluation_history_service.dart';
import '../services/auth_service.dart';
import '../models/teacher.dart';
import '../models/question.dart';
import '../models/evaluation.dart';

class EvaluationScreen extends StatefulWidget {
  final Teacher teacher;

  const EvaluationScreen({Key? key, required this.teacher}) : super(key: key);

  @override
  State<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends State<EvaluationScreen> {
  late Future<List<Question>> _questionsFuture;
  Map<String, dynamic> _ratings = {};
  String _feedbackComments = '';
  bool _isSubmitting = false;
  bool _draftLoaded = false;
  int _currentPage = 0;
  final int _questionsPerPage = 5;
  final DraftService _draftService = DraftService();
  late List<Question> _allQuestions;

  @override
  void initState() {
    super.initState();
    _questionsFuture = ApiService.getQuestions();
  }

  Future<void> _loadDraft() async {
    await _draftService.initialize();
    
    final draft = _draftService.loadDraft(widget.teacher.id);
    if (draft != null && mounted) {
      // Show recovery dialog
      _showDraftRecoveryDialog(draft);
    }
  }

  void _showDraftRecoveryDialog(Map<String, dynamic> draft) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        final savedAt = DateTime.parse(draft['savedAt'] as String);
        final now = DateTime.now();
        final diff = now.difference(savedAt);
        
        String timeAgo;
        if (diff.inSeconds < 60) {
          timeAgo = 'moments ago';
        } else if (diff.inMinutes < 60) {
          timeAgo = '${diff.inMinutes} minute${diff.inMinutes > 1 ? 's' : ''} ago';
        } else if (diff.inHours < 24) {
          timeAgo = '${diff.inHours} hour${diff.inHours > 1 ? 's' : ''} ago';
        } else {
          timeAgo = '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
        }

        return AlertDialog(
          title: const Text('Draft Found'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('You have an unsaved evaluation for ${widget.teacher.name}'),
              const SizedBox(height: 8),
              Text(
                'Saved $timeAgo',
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '📊 ${(draft['ratings'] as Map).length} ratings\n'
                '${(draft['feedbackComments'] as String?)?.isNotEmpty ?? false ? '💬 Has feedback' : ''}',
                style: const TextStyle(fontSize: 12),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _startFresh();
              },
              child: const Text('Start Fresh'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _recoverDraft(draft);
              },
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFF1976D2),
              ),
              child: const Text('Recover Draft'),
            ),
          ],
        );
      },
    );
  }

  void _recoverDraft(Map<String, dynamic> draft) {
    setState(() {
      _ratings = Map<String, dynamic>.from(draft['ratings'] as Map);
      _feedbackComments = draft['feedbackComments'] as String? ?? '';
    });
    ToastService.showInfo(context, '✅ Draft recovered');
  }

  void _startFresh() {
    setState(() {
      _ratings.clear();
      _feedbackComments = '';
    });
  }

  void _saveDraft() {
    _draftService.saveDraft(
      widget.teacher.id,
      ratings: _ratings,
      feedbackComments: _feedbackComments,
      teacherName: widget.teacher.name,
    );
  }

  Future<void> _submitEvaluation() async {
    if (_ratings.isEmpty) {
      ToastService.showWarning(context, 'Please rate at least one criterion');
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Get student number from auth service
      final authService = AuthService();
      final studentId = authService.getStudentNumber();
      
      if (studentId == null || studentId.isEmpty) {
        ToastService.showError(context, '❌ Error: Student ID not found. Please log in again.');
        setState(() {
          _isSubmitting = false;
        });
        return;
      }
      
      final evaluation = Evaluation(
        teacherId: widget.teacher.id,
        ratings: _ratings,
        feedbackComments: _feedbackComments.isEmpty ? null : _feedbackComments,
        studentId: studentId,
        submittedAt: DateTime.now(),
      );

      final success = await ApiService.submitEvaluation(evaluation);

      if (success) {
        // Add to evaluation history
        final historyService = EvaluationHistoryService();
        await historyService.initialize();
        await historyService.addEvaluation(
          teacherId: widget.teacher.id,
          teacherName: widget.teacher.name,
          ratings: _ratings,
          feedback: _feedbackComments,
        );

        // Delete draft after successful submission
        await _draftService.deleteDraft(widget.teacher.id);
        
        if (mounted) {
          ToastService.showSuccess(context, '✅ Evaluation submitted successfully!');
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(context, '❌ Error: $e');
      }
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // Save draft before leaving
        if (_ratings.isNotEmpty || _feedbackComments.isNotEmpty) {
          _saveDraft();
          ToastService.showInfo(context, '💾 Draft saved');
        }
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text('Evaluate ${widget.teacher.name}'),
          backgroundColor: const Color(0xFF1976D2),
          elevation: 0,
        ),
        body: FutureBuilder<List<Question>>(
          future: _questionsFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(
                child: CircularProgressIndicator(),
              );
            }

            if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text('Error: ${snapshot.error}'),
                  ],
                ),
              );
            }

            if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return const Center(
                child: Text('No questions available'),
              );
            }

            // Load draft on first build
            if (!_draftLoaded) {
              _allQuestions = snapshot.data!;
              _loadDraft();
              _draftLoaded = true;
            }

            final questions = snapshot.data!;
            final totalPages = (questions.length / _questionsPerPage).ceil();
            final startIndex = _currentPage * _questionsPerPage;
            final endIndex = (startIndex + _questionsPerPage).clamp(0, questions.length);
            final pageQuestions = questions.sublist(startIndex, endIndex);

            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Teacher Info Card
                    Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: const Color(0xFF1976D2),
                                  radius: 30,
                                  child: Text(
                                    widget.teacher.name.isNotEmpty
                                        ? widget.teacher.name[0].toUpperCase()
                                        : '?',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        widget.teacher.name,
                                        style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        widget.teacher.department,
                                        style: const TextStyle(
                                          color: Colors.grey,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Pagination indicator
                    if (totalPages > 1)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Question ${startIndex + 1} - ${endIndex.clamp(0, questions.length)} of ${questions.length}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1976D2).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                'Page ${_currentPage + 1} of $totalPages',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1976D2),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Evaluation Criteria Title
                    const Text(
                      'Evaluation Criteria',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Questions for current page
                    ...pageQuestions.map((question) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: _buildQuestionWidget(question),
                      );
                    }).toList(),

                    // Feedback Comments
                    const SizedBox(height: 8),
                    const Text(
                      'Additional Comments (Optional)',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      maxLines: 4,
                      controller: TextEditingController(text: _feedbackComments),
                      decoration: InputDecoration(
                        hintText: 'Share your feedback...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onChanged: (value) {
                        setState(() {
                          _feedbackComments = value;
                        });
                        // Auto-save on change
                        _saveDraft();
                      },
                    ),
                    const SizedBox(height: 20),

                    // Pagination buttons
                    if (totalPages > 1)
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _currentPage > 0
                                  ? () {
                                      _saveDraft();
                                      setState(() {
                                        _currentPage--;
                                      });
                                    }
                                  : null,
                              icon: const Icon(Icons.arrow_back),
                              label: const Text('Previous'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.grey.shade400,
                                disabledBackgroundColor: Colors.grey.shade200,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _currentPage < totalPages - 1
                                  ? () {
                                      _saveDraft();
                                      setState(() {
                                        _currentPage++;
                                      });
                                    }
                                  : null,
                              icon: const Icon(Icons.arrow_forward),
                              label: const Text('Next'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue.shade400,
                                disabledBackgroundColor: Colors.grey.shade200,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                        ],
                      ),

                    if (totalPages > 1) const SizedBox(height: 12),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitEvaluation,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1976D2),
                          disabledBackgroundColor: Colors.grey.shade400,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: _isSubmitting
                            ? const SizedBox(
                                height: 24,
                                width: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    Colors.white,
                                  ),
                                ),
                              )
                            : const Text(
                                'Submit Evaluation',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildQuestionWidget(Question question) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              question.text,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            if (question.type == 'rating' || question.type == 'scale')
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(5, (index) {
                  final rating = index + 1;
                  final isSelected = _ratings[question.id] == rating;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _ratings[question.id] = rating;
                      });
                      _saveDraft();
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? const Color(0xFF1976D2)
                            : Colors.grey.shade200,
                      ),
                      child: Center(
                        child: Text(
                          '$rating',
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              )
            else if (question.type == 'multiple_choice' &&
                question.options != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: question.options!
                    .map((option) {
                      final isSelected = _ratings[question.id] == option;
                      return RadioListTile<String>(
                        title: Text(option),
                        value: option,
                        groupValue: _ratings[question.id],
                        onChanged: (value) {
                          setState(() {
                            _ratings[question.id] = value;
                          });
                          _saveDraft();
                        },
                        contentPadding: EdgeInsets.zero,
                      );
                    })
                    .toList()
                    .cast<Widget>(),
              )
            else
              TextField(
                controller: TextEditingController(
                  text: _ratings[question.id] ?? '',
                ),
                decoration: InputDecoration(
                  hintText: 'Your answer...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                onChanged: (value) {
                  setState(() {
                    _ratings[question.id] = value;
                  });
                  _saveDraft();
                },
              ),
          ],
        ),
      ),
    );
  }
}
