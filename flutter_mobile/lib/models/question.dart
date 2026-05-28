class Question {
  final String id;
  final String text;
  final String type;
  final List<String>? options;
  final int? category;
  final int? setNumber; // NEW: 1-5 for sequential unlocking
  final Map<String, String>? choiceDescriptions; // NEW: {"1": "Strongly Disagree", ...}
  final Map<String, String>? ratingScale; // Fallback for choice descriptions

  Question({
    required this.id,
    required this.text,
    required this.type,
    this.options,
    this.category,
    this.setNumber,
    this.choiceDescriptions,
    this.ratingScale,
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

    // Parse set_number (NEW)
    int? parseSetNumber() {
      final setNum = json['set_number'];
      if (setNum is int) return setNum;
      if (setNum is String) {
        try {
          return int.parse(setNum);
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    // Parse choice_descriptions (NEW)
    Map<String, String>? parseChoiceDescriptions() {
      final choices = json['choice_descriptions'];
      if (choices is Map) {
        try {
          return Map<String, String>.from(
            choices.map((k, v) => MapEntry(k.toString(), v.toString()))
          );
        } catch (e) {
          print('⚠️ Failed to parse choice_descriptions: $e');
          return null;
        }
      }
      return null;
    }

    // Parse rating_scale (fallback)
    Map<String, String>? parseRatingScale() {
      final scale = json['rating_scale'];
      if (scale is Map) {
        try {
          return Map<String, String>.from(
            scale.map((k, v) => MapEntry(k.toString(), v.toString()))
          );
        } catch (e) {
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
      setNumber: parseSetNumber(),
      choiceDescriptions: parseChoiceDescriptions(),
      ratingScale: parseRatingScale(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'question_text': text,
      'question_type': type,
      'options': options,
      'category': category,
      'set_number': setNumber,
      'choice_descriptions': choiceDescriptions,
      'rating_scale': ratingScale,
    };
  }

  /// Get the choice label for a rating (1-5)
  /// Tries: choice_descriptions -> rating_scale -> default labels
  String getChoiceLabel(int rating) {
    final ratingStr = rating.toString();
    
    // Try primary source: choice_descriptions
    if (choiceDescriptions != null && choiceDescriptions!.containsKey(ratingStr)) {
      return choiceDescriptions![ratingStr] ?? '';
    }
    
    // Fallback: rating_scale
    if (ratingScale != null && ratingScale!.containsKey(ratingStr)) {
      return ratingScale![ratingStr] ?? '';
    }
    
    // Final fallback: default Likert scale labels
    const defaultLabels = [
      '', // 0 (unused)
      'Strongly Disagree',
      'Disagree',
      'Neutral',
      'Agree',
      'Strongly Agree'
    ];
    
    if (rating >= 0 && rating < defaultLabels.length) {
      return defaultLabels[rating];
    }
    
    return 'Option $rating';
  }
}
