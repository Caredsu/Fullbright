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

  /// Save draft evaluation
  Future<bool> saveDraft(String teacherId, {
    required Map<String, dynamic> ratings,
    required String feedbackComments,
    required String teacherName,
  }) async {
    _ensureInitialized();
    try {
      final draftData = {
        'teacherId': teacherId,
        'teacherName': teacherName,
        'ratings': ratings,
        'feedbackComments': feedbackComments,
        'savedAt': DateTime.now().toIso8601String(),
      };
      
      final json = jsonEncode(draftData);
      await _prefs.setString(_getDraftKey(teacherId), json);
      print('✅ Draft saved for teacher: $teacherName');
      return true;
    } catch (e) {
      print('❌ Error saving draft: $e');
      return false;
    }
  }

  /// Load draft evaluation
  Map<String, dynamic>? loadDraft(String teacherId) {
    _ensureInitialized();
    try {
      final draftJson = _prefs.getString(_getDraftKey(teacherId));
      if (draftJson != null) {
        final draft = jsonDecode(draftJson) as Map<String, dynamic>;
        print('✅ Draft loaded for teacher: ${draft['teacherName']}');
        print('   Saved at: ${draft['savedAt']}');
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
    _ensureInitialized();
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
    _ensureInitialized();
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
    _ensureInitialized();
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
    _ensureInitialized();
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

  void _ensureInitialized() {
    if (!_initialized) {
      throw Exception(
        'DraftService not initialized. Call DraftService().initialize() in main() first.',
      );
    }
  }
}
