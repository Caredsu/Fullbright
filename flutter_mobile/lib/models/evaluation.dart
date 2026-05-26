class Evaluation {
  final String? id;
  final String teacherId;
  final Map<String, dynamic> ratings;
  final String? feedbackComments;
  final String? studentId;
  final DateTime submittedAt;

  Evaluation({
    this.id,
    required this.teacherId,
    required this.ratings,
    this.feedbackComments,
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

    return Evaluation(
      id: json['_id'],
      teacherId: json['teacher_id'] ?? '',
      ratings: Map<String, dynamic>.from(json['ratings'] ?? {}),
      feedbackComments: json['feedback_comments'],
      studentId: json['student_id'],
      submittedAt: parseSubmittedAt(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'teacher_id': teacherId,
      'answers': ratings, // Backend expects 'answers' format for dynamic questions
      'feedback': feedbackComments ?? '', // Backend expects 'feedback' field
      'student_id': studentId ?? '', // Include authenticated student number
      'submitted_at': submittedAt.toIso8601String(),
    };
  }
}
