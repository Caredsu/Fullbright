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
    return Evaluation(
      id: json['_id'],
      teacherId: json['teacher_id'] ?? '',
      ratings: Map<String, dynamic>.from(json['ratings'] ?? {}),
      feedbackComments: json['feedback_comments'],
      studentId: json['student_id'],
      submittedAt: json['submitted_at'] != null
          ? DateTime.parse(json['submitted_at'])
          : DateTime.now(),
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
