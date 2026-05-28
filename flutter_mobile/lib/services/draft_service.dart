import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class DraftService {
  static final DraftService _instance = DraftService._internal();
  late SharedPreferences _prefs;
  bool _initialized = false;

  static const String _draftKeyPrefix = 'evaluation_draft_';

  factory DraftService() {
    return _instance;
  }

  DraftService._internal();

  /// Initialize the draft service
  Future<void> initialize() async {
    if (!_initialized) {
      _prefs = await SharedPreferences.getInstance();
      _initialized = true;
      print('✅ DraftService initialized');
    }
  }

  /// Get draft key for a specific teacher
  String _getDraftKey(String teacherId) {
    return '$_draftKeyPrefix$teacherId';
  }

  /// Save draft evaluation with all feedback fields (NEW: Phase 3 enhancement)
  /// Supports both old (ratings) and new (answers) formats
  Future<bool> saveDraft(String teacherId, {
    required Map<String, dynamic> answers,
    required String feedbackComments,
    required String teacherName,
    String? positiveFeedback,
    String? negativeFeedback,
    bool hasPositiveFeedback = false,
    bool hasNegativeFeedback = false,
  }) async {
    try {
      final answeredCount = answers.values.where((r) {
        final rating = r as int?;
        return rating != null && rating > 0;
      }).length;
      
      final draftData = {
        'teacherId': teacherId,
        'teacherName': teacherName,
        'answers': answers,
        'ratings': answers, // Backward compatibility
        'feedbackComments': feedbackComments,
        'positiveFeedback': positiveFeedback ?? '',
        'negativeFeedback': negativeFeedback ?? '',
        'hasPositiveFeedback': hasPositiveFeedback,
        'hasNegativeFeedback': hasNegativeFeedback,
        'answeredCount': answeredCount,
        'savedAt': DateTime.now().toIso8601String(),
      };
      
      final json = jsonEncode(draftData);
      await _prefs.setString(_getDraftKey(teacherId), json);
      print('✅ Draft saved for teacher: $teacherName ($answeredCount answers)');
      return true;
    } catch (e) {
      print('❌ Error saving draft: $e');
      return false;
    }
  }

  /// Load draft evaluation with 30-minute expiration check (NEW: Phase 3 enhancement)
  Map<String, dynamic>? loadDraft(String teacherId) {

    try {
      final draftJson = _prefs.getString(_getDraftKey(teacherId));
      if (draftJson != null) {
        final draft = jsonDecode(draftJson) as Map<String, dynamic>;
        
        // Check 30-minute expiration (NEW)
        final savedAt = DateTime.parse(draft['savedAt'] as String);
        final now = DateTime.now();
        final minutesOld = now.difference(savedAt).inMinutes;
        
        if (minutesOld > 30) {
          print('⚠️ Draft expired (${minutesOld} minutes old), discarding');
          deleteDraft(teacherId);
          return null;
        }
        
        print('✅ Draft loaded for teacher: ${draft['teacherName']}');
        print('   Saved at: ${draft['savedAt']} (${minutesOld} minutes ago)');
        print('   Answered: ${draft['answeredCount'] ?? (draft['ratings'] as Map).length} questions');
        return draft;
      }
      return null;
    } catch (e) {
      print('⚠️ Error loading draft: $e');
      return null;
    }
  }

  /// Check if draft exists
  bool hasDraft(String teacherId) {
    return _prefs.containsKey(_getDraftKey(teacherId));
  }

  /// Get draft info (for showing in UI)
  Map<String, dynamic>? getDraftInfo(String teacherId) {
    final draft = loadDraft(teacherId);
    if (draft != null) {
      return {
        'teacherName': draft['teacherName'],
        'savedAt': DateTime.parse(draft['savedAt'] as String),
        'ratingsCount': (draft['ratings'] as Map).length,
        'hasFeedback': (draft['feedbackComments'] as String?)?.isNotEmpty ?? false,
      };
    }
    return null;
  }

  /// Delete specific draft
  Future<bool> deleteDraft(String teacherId) async {
    try {
      await _prefs.remove(_getDraftKey(teacherId));
      print('✅ Draft deleted for teacher: $teacherId');
      return true;
    } catch (e) {
      print('❌ Error deleting draft: $e');
      return false;
    }
  }

  /// Delete all drafts
  Future<bool> deleteAllDrafts() async {
    try {
      final keys = _prefs.getKeys();
      for (var key in keys) {
        if (key.startsWith(_draftKeyPrefix)) {
          await _prefs.remove(key);
        }
      }
      print('✅ All drafts deleted');
      return true;
    } catch (e) {
      print('❌ Error deleting all drafts: $e');
      return false;
    }
  }

  /// Get list of all drafts
  List<Map<String, dynamic>> getAllDrafts() {
    try {
      final keys = _prefs.getKeys();
      final drafts = <Map<String, dynamic>>[];
      
      for (var key in keys) {
        if (key.startsWith(_draftKeyPrefix)) {
          final draftJson = _prefs.getString(key);
          if (draftJson != null) {
            drafts.add(jsonDecode(draftJson) as Map<String, dynamic>);
          }
        }
      }
      
      // Sort by saved date (newest first)
      drafts.sort((a, b) {
        final dateA = DateTime.parse(a['savedAt'] as String);
        final dateB = DateTime.parse(b['savedAt'] as String);
        return dateB.compareTo(dateA);
      });
      
      return drafts;
    } catch (e) {
      print('⚠️ Error getting all drafts: $e');
      return [];
    }
  }

  /// Get progress percentage (0-100) for answering questions (NEW: Phase 3)
  /// Calculates: (answered questions / total questions) * 100
  int getProgressPercentage(Map<String, dynamic> draft, int totalQuestions) {
    try {
      final answers = (draft['answers'] ?? draft['ratings']) as Map<String, dynamic>;
      final answeredCount = answers.values.where((r) {
        final rating = r as int?;
        return rating != null && rating > 0;
      }).length;
      
      if (totalQuestions == 0) return 0;
      
      final percentage = ((answeredCount / totalQuestions) * 100).toInt();
      print('📊 Progress: $answeredCount/$totalQuestions ($percentage%)');
      return percentage;
    } catch (e) {
      print('❌ Error calculating progress: $e');
      return 0;
    }
  }

  /// Check if a specific set is complete (NEW: Phase 3)
  /// Returns true if all questions in the set have ratings >= 1
  bool isSetComplete(
    Map<String, dynamic> draft,
    List<int> setQuestionIds,
  ) {
    try {
      if (setQuestionIds.isEmpty) return false;
      
      final answers = (draft['answers'] ?? draft['ratings']) as Map<String, dynamic>;
      
      for (final questionId in setQuestionIds) {
        final rating = (answers[questionId.toString()] ?? 0) as int;
        if (rating <= 0) {
          return false; // Found an unanswered question
        }
      }
      
      return true; // All questions answered
    } catch (e) {
      print('❌ Error checking set completion: $e');
      return false;
    }
  }

  /// Check draft age to see if close to 30-minute expiration (NEW: Phase 3)
  /// Returns true if draft is older than 25 minutes (warning threshold)
  bool isDraftExpiringWarning(Map<String, dynamic> draft, {int warnAfterMinutes = 25}) {
    try {
      final savedAt = DateTime.parse(draft['savedAt'] as String);
      final now = DateTime.now();
      final minutesOld = now.difference(savedAt).inMinutes;
      
      return minutesOld >= warnAfterMinutes;
    } catch (e) {
      return false;
    }
  }
}
