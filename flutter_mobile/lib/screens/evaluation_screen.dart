import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:async';
import 'dart:io';
import '../services/api_service.dart';
import '../services/draft_service.dart';
import '../services/duplicate_prevention_service.dart';
import '../services/toast_service.dart';
import '../services/evaluation_history_service.dart';
import '../services/auth_service.dart';
import '../services/offline_queue_service.dart'; // NEW: Phase 7
import '../models/teacher.dart';
import '../models/question.dart';
import '../models/evaluation.dart';
import '../widgets/skeleton_loader.dart'; // NEW: Phase 8
import 'success_screen.dart'; // NEW: Phase 5

class EvaluationScreen extends StatefulWidget {
  final Teacher teacher;

  const EvaluationScreen({Key? key, required this.teacher}) : super(key: key);

  @override
  State<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends State<EvaluationScreen> {
  late Future<List<Question>> _questionsFuture;
  
  // State management
  Map<String, dynamic> _answers = {}; // NEW: answers format instead of ratings
  String? _positiveFeedback; // NEW: Set 5 feedback
  String? _negativeFeedback; // NEW: Set 5 feedback
  bool _isSubmitting = false;
  bool _screenInitialized = false;
  int _currentSet = 1; // NEW: Track current set (1-5)
  
  // Services
  final DraftService _draftService = DraftService();
  final DuplicatePreventionService _duplicateService = DuplicatePreventionService();
  
  // Questions grouped by set
  Map<int, List<Question>> _questionsBySet = {}; // NEW: {1: [...], 2: [...], ...}
  
  // Expiration warning timer
  DateTime? _draftSavedTime;
  Timer? _expirationWarningTimer;

  @override
  void initState() {
    super.initState();
    _questionsFuture = _initializeEvaluation();
  }

  /// Initialize evaluation: Check eval enabled, check duplicates, load questions
  Future<List<Question>> _initializeEvaluation() async {
    try {
      // Step 1: Check if evaluation is enabled
      print('🔍 Step 1: Checking if evaluation is enabled...');
      final evalEnabled = await ApiService.checkEvalEnabled();
      if (!evalEnabled) {
        throw Exception('📋 Evaluation system is currently disabled');
      }

      // Step 2: Get student number
      print('🔍 Step 2: Getting student number...');
      final authService = AuthService();
      final studentNumber = authService.getStudentNumber();
      if (studentNumber == null || studentNumber.isEmpty) {
        throw Exception('❌ Student number not found. Please log in again.');
      }

      // Step 3: Initialize services
      print('🔍 Step 3: Initializing services...');
      await _draftService.initialize();
      await _duplicateService.initialize();

      // Step 4: Cross-device duplicate check (Phase 3 feature)
      print('🔍 Step 4: Checking for duplicate evaluations...');
      final isAlreadyEvaluated = await _duplicateService.isTeacherAlreadyEvaluated(
        widget.teacher.id,
        studentNumber,
      );

      if (isAlreadyEvaluated && mounted) {
        print('⚠️ Teacher already evaluated by this student');
        _showAlreadyEvaluatedModal();
      }

      // Step 5: Get questions
      print('🔍 Step 5: Loading questions...');
      final questions = await ApiService.getQuestions();

      if (mounted) {
        // Group questions by set_number (Phase 4 feature)
        _groupQuestionsBySet(questions);

        // Load draft if exists
        _loadDraftIfExists();
      }

      return questions;
    } catch (e) {
      print('❌ Initialization error: $e');
      throw Exception('Initialization failed: $e');
    }
  }

  /// Group questions by set_number (1-5)
  void _groupQuestionsBySet(List<Question> questions) {
    _questionsBySet.clear();

    for (final question in questions) {
      final setNum = question.setNumber ?? 1; // Default to set 1 if not specified
      if (!_questionsBySet.containsKey(setNum)) {
        _questionsBySet[setNum] = [];
      }
      _questionsBySet[setNum]!.add(question);
    }

    print('📊 Questions grouped by set: ${_questionsBySet.keys.toList()}');
    for (final entry in _questionsBySet.entries) {
      print('   Set ${entry.key}: ${entry.value.length} questions');
    }
  }

  /// Load draft if exists and not expired
  void _loadDraftIfExists() {
    final draft = _draftService.loadDraft(widget.teacher.id);
    
    if (draft == null) {
      print('ℹ️ No draft found');
      return;
    }

    // Check expiration (30-min threshold)
    if (_draftService.isDraftExpiringWarning(draft)) {
      print('⚠️ Draft is expiring soon, showing warning');
      _showDraftExpirationWarning();
    }

    // Show recovery dialog
    _showDraftRecoveryDialog(draft);
  }

  /// Show modal for already evaluated teacher
  void _showAlreadyEvaluatedModal() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('❌ Already Evaluated'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.block, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'You have already evaluated ${widget.teacher.name}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 8),
            const Text(
              'Each teacher can only be evaluated once per student.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context); // Close dialog
              Navigator.pop(context); // Go back to teachers list
            },
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }

  /// Show draft expiration warning (NEW: Phase 3 feature)
  void _showDraftExpirationWarning() {
    final now = DateTime.now();
    final minutesOld = now.difference(_draftSavedTime ?? now).inMinutes;
    final minutesRemaining = 30 - minutesOld;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '⏰ Your draft will expire in ${minutesRemaining} minute${minutesRemaining != 1 ? 's' : ''}',
        ),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 5),
      ),
    );
  }

  /// Show draft recovery dialog
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
                '📊 ${draft['answeredCount'] ?? (draft['answers'] as Map).length} answers\n'
                '${(draft['positiveFeedback'] as String?)?.isNotEmpty ?? false ? '👍 Positive feedback\n' : ''}'
                '${(draft['negativeFeedback'] as String?)?.isNotEmpty ?? false ? '👎 Negative feedback' : ''}',
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

  /// Recover draft data
  void _recoverDraft(Map<String, dynamic> draft) {
    setState(() {
      _answers = Map<String, dynamic>.from(draft['answers'] ?? draft['ratings'] as Map);
      _positiveFeedback = draft['positiveFeedback'] as String?;
      _negativeFeedback = draft['negativeFeedback'] as String?;
      _draftSavedTime = DateTime.parse(draft['savedAt'] as String);
    });
    ToastService.showInfo(context, '✅ Draft recovered');
  }

  /// Start fresh (clear all answers)
  void _startFresh() {
    setState(() {
      _answers.clear();
      _positiveFeedback = null;
      _negativeFeedback = null;
      _currentSet = 1;
    });
  }

  /// Save draft with 500ms debounce (NEW: Phase 3 feature)
  void _saveDraft() {
    _draftSavedTime = DateTime.now();
    _draftService.saveDraft(
      widget.teacher.id,
      answers: _answers,
      feedbackComments: '', // Deprecated, kept for backward compatibility
      teacherName: widget.teacher.name,
      positiveFeedback: _positiveFeedback,
      negativeFeedback: _negativeFeedback,
      hasPositiveFeedback: (_positiveFeedback?.isNotEmpty ?? false),
      hasNegativeFeedback: (_negativeFeedback?.isNotEmpty ?? false),
    );
  }

  /// Check if a set is complete (all questions answered)
  bool _isSetComplete(int setNum) {
    final setQuestions = _questionsBySet[setNum] ?? [];
    if (setQuestions.isEmpty) return false;

    for (final question in setQuestions) {
      final answer = _answers[question.id];
      if (answer == null || answer == 0 || (answer is String && answer.isEmpty)) {
        return false;
      }
    }
    return true;
  }

  /// Check if a set is unlocked (previous sets complete or set 1)
  bool _isSetUnlocked(int setNum) {
    if (setNum == 1) return true; // Set 1 always unlocked
    if (setNum == 5) return true; // Set 5 (feedback) always unlocked
    
    // Sets 2-4: Previous set must be complete
    return _isSetComplete(setNum - 1);
  }

  /// Submit evaluation
  // Phase 6: Enhanced error handling with retry and recovery
  Future<void> _submitEvaluation() async {
    // Validate all sets 1-4 are complete
    for (int i = 1; i <= 4; i++) {
      if (!_isSetComplete(i)) {
        ToastService.showWarning(
          context,
          '❌ Please complete all evaluation questions (Sets 1-4)',
        );
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      // Get student number
      final authService = AuthService();
      final studentNumber = authService.getStudentNumber();

      if (studentNumber == null || studentNumber.isEmpty) {
        throw Exception('❌ Student ID not found. Please log in again.');
      }

      // Create evaluation with new model (Phase 2 feature)
      final evaluation = Evaluation(
        teacherId: widget.teacher.id,
        answers: _answers, // NEW: answers format
        studentId: studentNumber,
        positiveFeedback: _positiveFeedback, // NEW: feedback fields
        negativeFeedback: _negativeFeedback, // NEW: feedback fields
        submittedAt: DateTime.now(),
      );

      // Submit with Phase 6 retry logic
      final success = await ApiService.submitEvaluation(evaluation);

      if (success && mounted) {
        // Mark as evaluated (NEW: Phase 3 feature)
        await _duplicateService.markTeacherAsEvaluated(
          widget.teacher.id,
          widget.teacher.name,
          studentNumber,
        );

        // Add to evaluation history
        final historyService = EvaluationHistoryService();
        await historyService.initialize();
        await historyService.addEvaluation(
          teacherId: widget.teacher.id,
          teacherName: widget.teacher.name,
          ratings: _answers,
          feedback: _positiveFeedback ?? _negativeFeedback ?? '',
        );

        // Delete draft
        await _draftService.deleteDraft(widget.teacher.id);

        // Navigate to success screen (NEW: Phase 5 feature)
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => SuccessScreen(
                teacherName: widget.teacher.name,
              ),
            ),
          );
        }
      }
    } on SocketException catch (e) {
      // Network error - Phase 7: Offer to queue
      if (mounted) {
        _showNetworkErrorDialog(
          'Network Connection Error', 
          e.message,
          canQueue: true,
          evaluation: _createEvaluation(),
        );
      }
    } on TimeoutException catch (e) {
      // Timeout error - Phase 7: Offer to queue
      if (mounted) {
        _showNetworkErrorDialog(
          'Request Timeout', 
          'The request is taking too long. Please check your internet connection and try again.',
          canQueue: true,
          evaluation: _createEvaluation(),
        );
      }
    } catch (e) {
      final errorMsg = e.toString();
      
      if (mounted) {
        // Check error type and show appropriate dialog
        if (errorMsg.contains('Evaluations are currently disabled')) {
          _showEvalDisabledDialog();
        } else if (errorMsg.contains('Invalid student information')) {
          _showStudentValidationErrorDialog();
        } else if (errorMsg.contains('Network error') || errorMsg.contains('offline')) {
          _showNetworkErrorDialog('Connection Failed', errorMsg);
        } else if (errorMsg.contains('timeout')) {
          _showNetworkErrorDialog('Request Timeout', errorMsg);
        } else {
          _showGenericErrorDialog(errorMsg);
        }
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  // Phase 8: Responsive helpers
  EdgeInsets _getResponsivePadding(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width < 400) {
      return const EdgeInsets.symmetric(horizontal: 12, vertical: 12);
    } else if (width < 600) {
      return const EdgeInsets.symmetric(horizontal: 16, vertical: 16);
    } else {
      return const EdgeInsets.symmetric(horizontal: 24, vertical: 20);
    }
  }

  double _getResponsiveFontSize(BuildContext context, double baseSize) {
    final width = MediaQuery.of(context).size.width;
    if (width < 400) {
      return baseSize * 0.85;
    } else if (width < 600) {
      return baseSize;
    } else {
      return baseSize * 1.1;
    }
  }

  // Phase 6: Error Handling Helper - Create evaluation object for submission
  Evaluation _createEvaluation() {
    final authService = AuthService();
    final studentNumber = authService.getStudentNumber();
    
    return Evaluation(
      teacherId: widget.teacher.id,
      answers: _answers,
      studentId: studentNumber ?? 'unknown',
      positiveFeedback: _positiveFeedback,
      negativeFeedback: _negativeFeedback,
      submittedAt: DateTime.now(),
    );
  }

  // Phase 6: Error Dialog - Network Error
  void _showNetworkErrorDialog(String title, String message, {
    bool canQueue = false,
    Evaluation? evaluation,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.cloud_off, color: Colors.orange),
            const SizedBox(width: 12),
            Text(title),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(message),
              if (canQueue)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 16),
                    const Text(
                      'Your evaluation can be saved offline and synced automatically when you\'re back online.',
                      style: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: Colors.grey,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Save draft before returning
              _saveDraft();
            },
            child: const Text('Save & Exit'),
          ),
          if (canQueue)
            TextButton(
              onPressed: () async {
                Navigator.pop(context);
                if (evaluation != null) {
                  // Queue the submission
                  await OfflineQueueService.queueSubmission(evaluation);
                  
                  // Mark as evaluated locally
                  final studentNumber = AuthService().getStudentNumber();
                  if (studentNumber != null) {
                    await _duplicateService.markTeacherAsEvaluated(
                      widget.teacher.id,
                      widget.teacher.name,
                      studentNumber,
                    );
                  }
                  
                  // Delete draft
                  await _draftService.deleteDraft(widget.teacher.id);
                  
                  // Show success message
                  if (mounted) {
                    ToastService.showSuccess(
                      context,
                      '📥 Evaluation queued - will sync when online',
                    );
                    
                    // Navigate back after 2 seconds
                    Future.delayed(Duration(seconds: 2), () {
                      if (mounted) {
                        Navigator.pop(context);
                      }
                    });
                  }
                }
              },
              child: const Text('Queue for Later'),
            ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _submitEvaluation(); // Retry
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  // Phase 6: Error Dialog - Evaluations Disabled
  void _showEvalDisabledDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.lock, color: Colors.red),
            const SizedBox(width: 12),
            const Text('Evaluations Disabled'),
          ],
        ),
        content: const Text(
          'Evaluations are currently disabled by the administrator. '
          'Please try again later.',
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back to teachers list
            },
            child: const Text('Go Back'),
          ),
        ],
      ),
    );
  }

  // Phase 6: Error Dialog - Student Validation Error
  void _showStudentValidationErrorDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.red),
            const SizedBox(width: 12),
            const Text('Authentication Error'),
          ],
        ),
        content: const Text(
          'Your student information is invalid. Please log in again.',
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context); // Go back
              Navigator.pop(context); // Go back to login
            },
            child: const Text('Log In Again'),
          ),
        ],
      ),
    );
  }

  // Phase 6: Error Dialog - Generic Error
  void _showGenericErrorDialog(String errorMessage) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.warning_amber, color: Colors.red),
            const SizedBox(width: 12),
            const Text('Submission Error'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Failed to submit your evaluation. Error details:'),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  errorMessage,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // Save draft before returning
              _saveDraft();
            },
            child: const Text('Save & Exit'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _submitEvaluation(); // Retry
            },
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _expirationWarningTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // Save draft before leaving
        if (_answers.isNotEmpty ||
            (_positiveFeedback?.isNotEmpty ?? false) ||
            (_negativeFeedback?.isNotEmpty ?? false)) {
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
              // Phase 8: Show skeleton loader instead of spinner
              return const SkeletonEvaluationScreen();
            }

            if (snapshot.hasError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Error: ${snapshot.error}',
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Go Back'),
                    ),
                  ],
                ),
              );
            }

            if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return const Center(
                child: Text('No questions available'),
              );
            }

            // Mark as initialized
            if (!_screenInitialized) {
              _screenInitialized = true;
            }

            final currentSetQuestions = _questionsBySet[_currentSet] ?? [];

            return SingleChildScrollView(
              child: Padding(
                padding: _getResponsivePadding(context), // Phase 8: Responsive padding
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Teacher Info Card
                    _buildTeacherInfoCard(),
                    const SizedBox(height: 20),

                    // Set Navigation Tabs (NEW: Phase 4)
                    _buildSetNavigationTabs(),
                    const SizedBox(height: 20),

                    // Progress Indicator (NEW: Phase 4)
                    _buildProgressIndicator(),
                    const SizedBox(height: 20),

                    // Set Title and Instructions (NEW: Phase 4)
                    _buildSetHeader(),
                    const SizedBox(height: 16),

                    // Questions for current set
                    if (currentSetQuestions.isEmpty)
                      const Center(
                        child: Text('No questions in this set'),
                      )
                    else
                      ...currentSetQuestions.map((question) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 20),
                          child: _buildQuestionWidget(question),
                        );
                      }).toList(),

                    // Feedback Fields (NEW: Phase 4, Set 5 only)
                    if (_currentSet == 5) ...[
                      const SizedBox(height: 16),
                      _buildFeedbackSection(),
                    ],

                    const SizedBox(height: 24),

                    // Set Navigation Buttons (NEW: Phase 4)
                    _buildSetNavigationButtons(),
                    const SizedBox(height: 16),

                    // Submit Button (only visible on Set 5)
                    if (_currentSet == 5)
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

  /// Build teacher info card (existing code, kept for reference)
  Widget _buildTeacherInfoCard() {
    final initial = widget.teacher.name.isNotEmpty
        ? widget.teacher.name[0].toUpperCase()
        : '?';
    
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.grey.shade200,
                  width: 2,
                ),
              ),
              child: widget.teacher.profileImage != null && widget.teacher.profileImage!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: widget.teacher.profileImage!,
                      imageBuilder: (context, imageProvider) => Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          image: DecorationImage(
                            image: imageProvider,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      placeholder: (context, url) => CircleAvatar(
                        backgroundColor: const Color(0xFF1976D2),
                        radius: 30,
                        child: Text(
                          initial,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      errorWidget: (context, url, error) => CircleAvatar(
                        backgroundColor: const Color(0xFF1976D2),
                        radius: 30,
                        child: Text(
                          initial,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    )
                  : CircleAvatar(
                      backgroundColor: const Color(0xFF1976D2),
                      radius: 30,
                      child: Text(
                        initial,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
      ),
    );
  }

  /// Build set navigation tabs (NEW: Phase 4)
  Widget _buildSetNavigationTabs() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(5, (index) {
          final setNum = index + 1;
          final isUnlocked = _isSetUnlocked(setNum);
          final isComplete = _isSetComplete(setNum);
          final isCurrentSet = _currentSet == setNum;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: isUnlocked
                  ? () {
                      setState(() {
                        _currentSet = setNum;
                      });
                    }
                  : null,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: (isCurrentSet
                      ? const Color(0xFF1976D2)
                      : (isComplete ? Colors.green : Colors.grey.shade200)).withOpacity(
                    isUnlocked ? 1.0 : 0.5,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isCurrentSet
                        ? const Color(0xFF1976D2)
                        : Colors.grey.shade300,
                  ),
                ),
                child: Column(
                  children: [
                    Text(
                      'Set $setNum',
                      style: TextStyle(
                        color: isCurrentSet || isComplete
                            ? Colors.white
                            : Colors.black87,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                    if (isComplete)
                      const Text(
                        '✓',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      )
                    else if (!isUnlocked)
                      const Text(
                        '🔒',
                        style: TextStyle(fontSize: 10),
                      ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  /// Build progress indicator (NEW: Phase 4)
  Widget _buildProgressIndicator() {
    final currentSetQuestions = _questionsBySet[_currentSet] ?? [];
    final answeredCount = currentSetQuestions
        .where((q) {
          final answer = _answers[q.id];
          return answer != null && answer != 0 && (answer is! String || answer.isNotEmpty);
        })
        .length;

    final progress = currentSetQuestions.isEmpty
        ? 0.0
        : answeredCount / currentSetQuestions.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Set $_currentSet Progress',
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              '$answeredCount/${currentSetQuestions.length}',
              style: const TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            backgroundColor: Colors.grey.shade200,
            valueColor: const AlwaysStoppedAnimation<Color>(
              Color(0xFF1976D2),
            ),
          ),
        ),
      ],
    );
  }

  /// Build set header with title and instructions (NEW: Phase 4)
  Widget _buildSetHeader() {
    final setTitles = {
      1: 'Teaching Quality',
      2: 'Knowledge & Expertise',
      3: 'Communication',
      4: 'Student Support',
      5: 'Overall Feedback',
    };

    final setInstructions = {
      1: 'Rate the teacher\'s teaching methods and classroom management',
      2: 'Evaluate subject matter knowledge and preparation',
      3: 'Assess communication clarity and engagement',
      4: 'Rate availability and support for students',
      5: 'Provide additional feedback (optional)',
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          setTitles[_currentSet] ?? 'Set $_currentSet',
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          setInstructions[_currentSet] ?? '',
          style: const TextStyle(
            fontSize: 14,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  /// Build feedback section (NEW: Phase 4, Set 5 only)
  Widget _buildFeedbackSection() {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Additional Feedback (Optional)',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),

            // Positive Feedback (NEW)
            const Text(
              '👍 What went well?',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              maxLines: 3,
              maxLength: 500,
              textDirection: TextDirection.ltr,
              controller: TextEditingController(text: _positiveFeedback ?? ''),
              decoration: InputDecoration(
                hintText: 'Share positive aspects...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                counterText: '', // Hide counter, show manually
              ),
              onChanged: (value) {
                setState(() {
                  _positiveFeedback = value;
                });
                _saveDraft();
              },
            ),
            Text(
              '${_positiveFeedback?.length ?? 0}/500',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 20),

            // Negative Feedback (NEW)
            const Text(
              '👎 What could be improved?',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              maxLines: 3,
              maxLength: 500,
              textDirection: TextDirection.ltr,
              controller: TextEditingController(text: _negativeFeedback ?? ''),
              decoration: InputDecoration(
                hintText: 'Share constructive feedback...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                counterText: '', // Hide counter, show manually
              ),
              onChanged: (value) {
                setState(() {
                  _negativeFeedback = value;
                });
                _saveDraft();
              },
            ),
            Text(
              '${_negativeFeedback?.length ?? 0}/500',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build set navigation buttons (NEW: Phase 4, Phase 8: Responsive)
  Widget _buildSetNavigationButtons() {
    final canGoPrevious = _currentSet > 1;
    final canGoNext = _currentSet < 5;
    final isSmallScreen = MediaQuery.of(context).size.width < 400;

    return Row(
      children: [
        if (canGoPrevious)
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () {
                _saveDraft();
                setState(() {
                  _currentSet--;
                });
              },
              icon: Icon(
                Icons.arrow_back,
                size: isSmallScreen ? 18 : 20,
              ),
              label: Text(
                isSmallScreen ? 'Prev' : 'Previous Set',
                style: TextStyle(
                  fontSize: isSmallScreen ? 12 : 14,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.grey.shade400,
                padding: EdgeInsets.symmetric(
                  vertical: isSmallScreen ? 8 : 12,
                  horizontal: isSmallScreen ? 8 : 12,
                ),
              ),
            ),
          ),
        if (canGoPrevious && canGoNext) const SizedBox(width: 12),
        if (canGoNext)
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _isSetComplete(_currentSet)
                  ? () {
                      _saveDraft();
                      setState(() {
                        _currentSet++;
                      });
                    }
                  : null,
              icon: Icon(
                Icons.arrow_forward,
                size: isSmallScreen ? 18 : 20,
              ),
              label: Text(
                isSmallScreen ? 'Next' : 'Next Set',
                style: TextStyle(
                  fontSize: isSmallScreen ? 12 : 14,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue.shade400,
                disabledBackgroundColor: Colors.grey.shade200,
                padding: EdgeInsets.symmetric(
                  vertical: isSmallScreen ? 8 : 12,
                  horizontal: isSmallScreen ? 8 : 12,
                ),
              ),
            ),
          ),
      ],
    );
  }

  /// Build question widget (NEW: Phase 4, uses getChoiceLabel from model)
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
              Column(
                children: List.generate(5, (index) {
                  final rating = index + 1;
                  final isSelected = _answers[question.id] == rating;
                  final label = question.getChoiceLabel(rating);

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: GestureDetector(
                      onTap: () {
                        setState(() {
                          _answers[question.id] = rating;
                        });
                        _saveDraft();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF1976D2) : Colors.grey.shade300,
                            width: isSelected ? 2 : 1,
                          ),
                          color: isSelected ? const Color(0xFFE3F2FD) : Colors.white,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF1976D2) : Colors.grey.shade400,
                                  width: 2,
                                ),
                                color: isSelected ? const Color(0xFF1976D2) : Colors.white,
                              ),
                              child: isSelected
                                  ? const Center(
                                      child: Icon(
                                        Icons.check,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '$rating',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: isSelected ? const Color(0xFF1976D2) : Colors.black,
                                    ),
                                  ),
                                  if (label.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        label,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: isSelected ? const Color(0xFF1976D2) : Colors.grey.shade600,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
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
                      final isSelected = _answers[question.id] == option;
                      return RadioListTile<String>(
                        title: Text(option),
                        value: option,
                        groupValue: _answers[question.id],
                        onChanged: (value) {
                          setState(() {
                            _answers[question.id] = value;
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
                  text: _answers[question.id] ?? '',
                ),
                decoration: InputDecoration(
                  hintText: 'Your answer...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                onChanged: (value) {
                  setState(() {
                    _answers[question.id] = value;
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
