import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  late SharedPreferences _prefs;
  bool _initialized = false;

  // Private keys for SharedPreferences
  static const String _studentNumberKey = 'student_number';
  static const String _authTokenKey = 'auth_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _dataPrivacyConsentKey = 'data_privacy_consent';
  static const String _lastLoginTimeKey = 'last_login_time';

  factory AuthService() {
    return _instance;
  }

  AuthService._internal();

  /// Initialize the auth service (call once at app startup)
  Future<void> initialize() async {
    if (!_initialized) {
      _prefs = await SharedPreferences.getInstance();
      _initialized = true;
      print('✅ AuthService initialized');
    }
  }

  /// Check if user is currently authenticated (has valid token)
  bool isAuthenticated() {
    _ensureInitialized();
    final token = _prefs.getString(_authTokenKey);
    return token != null && token.isNotEmpty;
  }

  /// Check if user has accepted data privacy consent
  bool isConsentGiven() {
    _ensureInitialized();
    return _prefs.getBool(_dataPrivacyConsentKey) ?? false;
  }

  /// Accept data privacy consent
  Future<bool> acceptPrivacy() async {
    _ensureInitialized();
    try {
      final result = await _prefs.setBool(_dataPrivacyConsentKey, true);
      print('✅ Data privacy consent accepted');
      return result;
    } catch (e) {
      print('❌ Error accepting privacy consent: $e');
      return false;
    }
  }

  /// Save login credentials and tokens (matches React web)
  Future<bool> login(String studentNumber, String authToken, {String? refreshToken}) async {
    _ensureInitialized();
    try {
      await _prefs.setString(_studentNumberKey, studentNumber);
      await _prefs.setString(_authTokenKey, authToken);
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _prefs.setString(_refreshTokenKey, refreshToken);
      }
      await _prefs.setString(
        _lastLoginTimeKey,
        DateTime.now().toIso8601String(),
      );
      print('✅ Login successful for student: $studentNumber');
      print('🔐 Access token and refresh token stored');
      return true;
    } catch (e) {
      print('❌ Error saving login data: $e');
      return false;
    }
  }

  /// Get stored student number
  String? getStudentNumber() {
    _ensureInitialized();
    return _prefs.getString(_studentNumberKey);
  }

  /// Get stored authentication token
  String? getAuthToken() {
    _ensureInitialized();
    return _prefs.getString(_authTokenKey);
  }

  /// Get stored refresh token
  String? getRefreshToken() {
    _ensureInitialized();
    return _prefs.getString(_refreshTokenKey);
  }

  /// Get last login time
  DateTime? getLastLoginTime() {
    _ensureInitialized();
    final timeString = _prefs.getString(_lastLoginTimeKey);
    if (timeString != null) {
      try {
        return DateTime.parse(timeString);
      } catch (e) {
        print('⚠️ Error parsing last login time: $e');
        return null;
      }
    }
    return null;
  }

  /// Logout: Clear all auth data
  Future<bool> logout() async {
    _ensureInitialized();
    try {
      await _prefs.remove(_studentNumberKey);
      await _prefs.remove(_authTokenKey);
      await _prefs.remove(_refreshTokenKey);
      await _prefs.remove(_lastLoginTimeKey);
      print('✅ Logout successful - all tokens cleared');
      return true;
    } catch (e) {
      print('❌ Error during logout: $e');
      return false;
    }
  }

  /// Reject data privacy consent (optional: for logout with consent revoke)
  Future<bool> rejectPrivacy() async {
    _ensureInitialized();
    try {
      await _prefs.remove(_dataPrivacyConsentKey);
      await logout();
      print('✅ Privacy consent rejected and user logged out');
      return true;
    } catch (e) {
      print('❌ Error rejecting privacy: $e');
      return false;
    }
  }

  /// Clear all stored data (full reset)
  Future<bool> clearAll() async {
    _ensureInitialized();
    try {
      await _prefs.clear();
      print('✅ All auth data cleared');
      return true;
    } catch (e) {
      print('❌ Error clearing auth data: $e');
      return false;
    }
  }

  /// Private helper to ensure initialization
  void _ensureInitialized() {
    if (!_initialized) {
      throw Exception(
        'AuthService not initialized. Call AuthService().initialize() in main() first.',
      );
    }
  }

  /// Get auth headers for API requests (with token if available)
  Map<String, String> getAuthHeaders() {
    _ensureInitialized();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = getAuthToken();
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }
}
