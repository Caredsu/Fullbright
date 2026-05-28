class Evaluation {
  final String? id;
  final String teacherId;
  final Map<String, dynamic> answers; // Primary format (question_id -> rating)
  final Map<String, dynamic>? ratings; // Fallback for backward compatibility
  final String? feedbackComments; // Legacy field
  final String? positiveFeedback; // NEW: Set 5 feedback
  final String? negativeFeedback; // NEW: Set 5 feedback (Areas for Improvement)
  final String? studentId;
  final DateTime submittedAt;

  Evaluation({
    this.id,
    required this.teacherId,
    required this.answers,
    this.ratings,
    this.feedbackComments,
    this.positiveFeedback,
    this.negativeFeedback,
    this.studentId,
    required this.submittedAt,
  });

  factory Evaluation.fromJson(Map<String, dynamic> json) {
    // Safely parse submitted_at with fallback
    DateTime parseSubmittedAt() {
      try {
        final submitStr = json['submitted_at'];
        if (submitStr is String) {
          return DateTime.parse(submitStr);
        }
      } catch (e) {
        print('⚠️ Failed to parse submitted_at: $e');
      }
      return DateTime.now();
    }

    // Support both 'answers' (new) and 'ratings' (old) formats
    final answersData = json['answers'] ?? json['ratings'] ?? {};
    final answers = Map<String, dynamic>.from(answersData);

    return Evaluation(
      id: json['_id'],
      teacherId: json['teacher_id'] ?? '',
      answers: answers,
      ratings: json['ratings'] != null ? Map<String, dynamic>.from(json['ratings']) : null,
      feedbackComments: json['feedback_comments'] ?? json['feedback'],
      positiveFeedback: json['positive_feedback'],
      negativeFeedback: json['negative_feedback'],
      studentId: json['student_id'],
      submittedAt: parseSubmittedAt(),
    );
  }

  /// Legacy format for old API endpoints
  Map<String, dynamic> toJson() {
    return {
      'teacher_id': teacherId,
      'answers': answers, // Backend expects 'answers' format
      'feedback': feedbackComments ?? '', // Fallback for old endpoints
      'student_id': studentId ?? '', // Include authenticated student number
      'submitted_at': submittedAt.toIso8601String(),
      'positive_feedback': positiveFeedback,
      'negative_feedback': negativeFeedback,
    };
  }

  /// NEW: Correctly formatted payload for API submission
  /// Follows backend validation requirements exactly
  Map<String, dynamic> toSubmissionPayload() {
    final payload = {
      'teacher_id': teacherId,
      'answers': answers, // Required: object format { question_id: rating }
      'student_id': studentId ?? '', // Required: never allow 'anonymous'
    };

    // Calculate average rating from answers
    if (answers.isNotEmpty) {
      final ratings = answers.values
          .whereType<int>()
          .where((r) => r > 0)
          .toList();
      if (ratings.isNotEmpty) {
        final average = ratings.reduce((a, b) => a + b) / ratings.length;
        payload['rating'] = double.parse(average.toStringAsFixed(1));
      }
    }

    // Include feedback fields if present and not empty
    if (positiveFeedback != null && positiveFeedback!.isNotEmpty) {
      payload['positive_feedback'] = positiveFeedback!.trim();
    }
    if (negativeFeedback != null && negativeFeedback!.isNotEmpty) {
      payload['negative_feedback'] = negativeFeedback!.trim();
    }

    return payload;
  }
}
