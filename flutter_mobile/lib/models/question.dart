class Question {
  final String id;
  final String text;
  final String type;
  final List<String>? options;
  final int? category;

  Question({
    required this.id,
    required this.text,
    required this.type,
    this.options,
    this.category,
  });

  factory Question.fromJson(Map<String, dynamic> json) {
    return Question(
      id: json['_id'] ?? json['id'] ?? '',
      text: json['question_text'] ?? json['text'] ?? '',
      type: json['question_type'] ?? json['type'] ?? 'rating',
      options: json['options'] != null
          ? List<String>.from(json['options'] as List)
          : null,
      category: json['category'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'question_text': text,
      'question_type': type,
      'options': options,
      'category': category,
    };
  }
}
