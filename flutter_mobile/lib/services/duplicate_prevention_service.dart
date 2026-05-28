import 'package:shared_preferences/shared_preferences.dart';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'dart:io';
import '../services/api_service.dart';
import '../services/toast_service.dart';

class DuplicatePreventionService {
  static final DuplicatePreventionService _instance =
      DuplicatePreventionService._internal();
  late SharedPreferences _prefs;
  late String _deviceId;
  bool _initialized = false;

  factory DuplicatePreventionService() {
    return _instance;
  }

  DuplicatePreventionService._internal();

  /// Initialize the duplicate prevention service
  Future<void> initialize() async {
    if (!_initialized) {
      _prefs = await SharedPreferences.getInstance();
      _deviceId = await _getDeviceId();
      _initialized = true;
      print('✅ DuplicatePreventionService initialized with device ID: $_deviceId');
    }
  }

  /// Ensure service is initialized before use
  void _ensureInitialized() {
    if (!_initialized) {
      throw Exception(
          'DuplicatePreventionService not initialized. Call initialize() first.');
    }
  }

  /// Generate unique device fingerprint
  /// Uses platform name + timestamp stored locally for consistency
  /// Returns SHA256 hash for privacy
  Future<String> _getDeviceId() async {
    try {
      // Try to get stored device ID first
      final stored = _prefs.getString('device_id');
      if (stored != null) {
        print('📱 Using existing device ID: ${stored.substring(0, 16)}...');
        return stored;
      }

      // Generate new device ID based on platform + timestamp
      String fingerprint = '';

      if (Platform.isAndroid) {
        fingerprint = 'android_${DateTime.now().millisecondsSinceEpoch}';
      } else if (Platform.isIOS) {
        fingerprint = 'ios_${DateTime.now().millisecondsSinceEpoch}';
      } else if (Platform.isWindows) {
        fingerprint = 'windows_${DateTime.now().millisecondsSinceEpoch}';
      } else if (Platform.isLinux) {
        fingerprint = 'linux_${DateTime.now().millisecondsSinceEpoch}';
      } else {
        fingerprint = 'unknown_${DateTime.now().millisecondsSinceEpoch}';
      }

      // Return SHA256 hash for privacy
      final hash = sha256.convert(utf8.encode(fingerprint)).toString();
      
      // Store for consistency across sessions
      await _prefs.setString('device_id', hash);
      
      print('📱 Device fingerprint generated: ${hash.substring(0, 16)}...');
      return hash;
    } catch (e) {
      print('❌ Failed to generate device ID: $e');
      // Fallback: Use timestamp-based ID
      return 'device_${DateTime.now().millisecondsSinceEpoch}';
    }
  }

  /// Storage key for evaluated teachers per student
  String _getStorageKey(String studentNumber) {
    return 'evaluated_teachers_$studentNumber';
  }

  /// Check if teacher already evaluated by this student (cross-device via API)
  /// Falls back to local check if offline
  Future<bool> isTeacherAlreadyEvaluated(
    String teacherId,
    String studentNumber,
  ) async {
    _ensureInitialized();

    try {
      // First try: Cross-device check via API
      print(
          '🔍 Checking if teacher $teacherId already evaluated (cross-device check)...');

      final evaluatedTeachers =
          await ApiService.getEvaluatedTeachers(studentNumber);

      if (evaluatedTeachers.isNotEmpty) {
        final isEvaluated = evaluatedTeachers.containsKey(teacherId);
        print(
            '✅ API check result: ${isEvaluated ? 'Already evaluated' : 'Not evaluated'}');
        return isEvaluated;
      } else {
        print('ℹ️ No evaluated teachers found in API response');
      }
    } catch (e) {
      print(
          '⚠️ Cross-device check failed (offline?): $e - Falling back to local check');
      print('💡 Using offline check (no internet)');
    }

    // Fallback: Local check if API fails
    return _isTeacherEvaluatedLocally(teacherId, studentNumber);
  }

  /// Check locally stored evaluated teachers (fallback if offline)
  bool _isTeacherEvaluatedLocally(String teacherId, String studentNumber) {
    try {
      final storageKey = _getStorageKey(studentNumber);
      final jsonString = _prefs.getString(storageKey);

      if (jsonString == null) {
        print('ℹ️ No local evaluation history for student $studentNumber');
        return false;
      }

      final list = jsonDecode(jsonString) as List;
      final evaluated =
          list.any((item) => item['teacherId'] == teacherId);

      if (evaluated) {
        print('📝 Local record: Teacher $teacherId already evaluated');
      } else {
        print('📝 Local record: Teacher $teacherId not evaluated');
      }

      return evaluated;
    } catch (e) {
      print('❌ Error checking local evaluation history: $e');
      return false;
    }
  }

  /// Mark teacher as evaluated locally
  /// Called after successful submission
  Future<void> markTeacherAsEvaluated(
    String teacherId,
    String teacherName,
    String studentNumber,
  ) async {
    _ensureInitialized();

    try {
      final storageKey = _getStorageKey(studentNumber);
      final evaluatedEntry = {
        'teacherId': teacherId,
        'teacherName': teacherName,
        'evaluatedAt': DateTime.now().toIso8601String(),
        'deviceId': _deviceId,
      };

      // Get existing list or create new
      final jsonString = _prefs.getString(storageKey);
      List evaluatedList = [];

      if (jsonString != null) {
        evaluatedList = jsonDecode(jsonString) as List;
      }

      // Add new entry (avoid duplicates)
      if (!evaluatedList.any((item) => item['teacherId'] == teacherId)) {
        evaluatedList.add(evaluatedEntry);
      }

      // Save back to storage
      await _prefs.setString(storageKey, jsonEncode(evaluatedList));
      print(
          '✅ Marked teacher "$teacherName" as evaluated for student $studentNumber');
    } catch (e) {
      print('❌ Error marking teacher as evaluated: $e');
    }
  }

  /// Get list of evaluated teacher IDs for student
  Future<List<String>> getEvaluatedTeacherIds(String studentNumber) async {
    _ensureInitialized();

    try {
      final storageKey = _getStorageKey(studentNumber);
      final jsonString = _prefs.getString(storageKey);

      if (jsonString == null) {
        return [];
      }

      final list = jsonDecode(jsonString) as List;
      return list.map((item) => item['teacherId'] as String).toList();
    } catch (e) {
      print('❌ Error getting evaluated teachers: $e');
      return [];
    }
  }

  /// Get full evaluated teachers data (for display/debugging)
  Future<List<Map<String, dynamic>>> getEvaluatedTeachers(
    String studentNumber,
  ) async {
    _ensureInitialized();

    try {
      final storageKey = _getStorageKey(studentNumber);
      final jsonString = _prefs.getString(storageKey);

      if (jsonString == null) {
        return [];
      }

      final list = jsonDecode(jsonString) as List;
      return List<Map<String, dynamic>>.from(list);
    } catch (e) {
      print('❌ Error getting evaluated teachers data: $e');
      return [];
    }
  }

  /// Clear all evaluated teachers for a student (on logout or reset)
  Future<void> clearEvaluatedTeachers(String studentNumber) async {
    _ensureInitialized();

    try {
      final storageKey = _getStorageKey(studentNumber);
      await _prefs.remove(storageKey);
      print('✅ Cleared evaluated teachers for student $studentNumber');
    } catch (e) {
      print('❌ Error clearing evaluated teachers: $e');
    }
  }

  /// Clear all evaluated teachers for all students (on app reset)
  Future<void> clearAll() async {
    _ensureInitialized();

    try {
      final keys = _prefs.getKeys();
      final evaluatedKeys =
          keys.where((k) => k.startsWith('evaluated_teachers_')).toList();

      for (final key in evaluatedKeys) {
        await _prefs.remove(key);
      }

      print(
          '✅ Cleared all evaluated teachers data (${evaluatedKeys.length} entries)');
    } catch (e) {
      print('❌ Error clearing all evaluated teachers: $e');
    }
  }
}
