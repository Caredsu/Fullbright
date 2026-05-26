import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class EvaluationHistoryService {
  static final EvaluationHistoryService _instance =
      EvaluationHistoryService._internal();
  late SharedPreferences _prefs;
  bool _initialized = false;

  static const String _historyKey = 'evaluation_history';
  static const int _maxHistoryItems = 20;

  factory EvaluationHistoryService() {
    return _instance;
  }

  EvaluationHistoryService._internal();

  /// Initialize the service
  Future<void> initialize() async {
    if (!_initialized) {
      _prefs = await SharedPreferences.getInstance();
      _initialized = true;
      print('✅ EvaluationHistoryService initialized');
    }
  }

  /// Add evaluation to history
  Future<bool> addEvaluation({
    required String teacherId,
    required String teacherName,
    required Map<String, dynamic> ratings,
    String? feedback,
  }) async {
    _ensureInitialized();
    try {
      final history = getHistory();
      
      final newEval = {
        'teacherId': teacherId,
        'teacherName': teacherName,
        'ratingsCount': ratings.length,
        'hasFeedback': (feedback?.isNotEmpty ?? false),
        'submittedAt': DateTime.now().toIso8601String(),
      };

      // Add to beginning (newest first)
      history.insert(0, newEval);

      // Keep only last 20 evaluations
      if (history.length > _maxHistoryItems) {
        history.removeRange(_maxHistoryItems, history.length);
      }

      await _prefs.setString(_historyKey, jsonEncode(history));
      print('✅ Evaluation added to history: $teacherName');
      return true;
    } catch (e) {
      print('❌ Error adding evaluation to history: $e');
      return false;
    }
  }

  /// Get all evaluations history
  List<Map<String, dynamic>> getHistory() {
    _ensureInitialized();
    try {
      final historyJson = _prefs.getString(_historyKey);
      if (historyJson != null) {
        final List<dynamic> decoded = jsonDecode(historyJson);
        return decoded.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      print('⚠️ Error loading history: $e');
      return [];
    }
  }

  /// Get recent evaluations (limited)
  List<Map<String, dynamic>> getRecent({int limit = 5}) {
    final history = getHistory();
    return history.take(limit).toList();
  }

  /// Get evaluations for a specific teacher
  List<Map<String, dynamic>> getTeacherEvaluations(String teacherId) {
    final history = getHistory();
    return history.where((e) => e['teacherId'] == teacherId).toList();
  }

  /// Check if teacher was recently evaluated
  bool wasRecentlyEvaluated(String teacherId) {
    return getTeacherEvaluations(teacherId).isNotEmpty;
  }

  /// Get last evaluation date for a teacher
  DateTime? getLastEvaluationDate(String teacherId) {
    final evals = getTeacherEvaluations(teacherId);
    if (evals.isNotEmpty) {
      try {
        return DateTime.parse(evals.first['submittedAt'] as String);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /// Clear all history
  Future<bool> clearHistory() async {
    _ensureInitialized();
    try {
      await _prefs.remove(_historyKey);
      print('✅ Evaluation history cleared');
      return true;
    } catch (e) {
      print('❌ Error clearing history: $e');
      return false;
    }
  }

  void _ensureInitialized() {
    if (!_initialized) {
      throw Exception(
        'EvaluationHistoryService not initialized. Call initialize() first.',
      );
    }
  }
}
