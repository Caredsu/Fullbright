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
    // Safely parse category - handle both String and int types
    int? parseCategory() {
      final cat = json['category'];
      if (cat is int) return cat;
      if (cat is String) {
        try {
          return int.parse(cat);
        } catch (e) {
          print('⚠️ Failed to parse category "$cat" as int');
          return null;
        }
      }
      return null;
    }

    // Safely parse options - handle different formats
    List<String>? parseOptions() {
      final opts = json['options'];
      if (opts is List) {
        try {
          return List<String>.from(opts.map((o) => o.toString()));
        } catch (e) {
          print('⚠️ Failed to parse options: $e');
          return null;
        }
      }
      return null;
    }

    return Question(
      id: json['_id'] ?? json['id'] ?? '',
      text: json['question_text'] ?? json['text'] ?? '',
      type: json['question_type'] ?? json['type'] ?? 'rating',
      options: parseOptions(),
      category: parseCategory(),
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
