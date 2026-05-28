import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:io';
import 'dart:async';
import '../models/teacher.dart';
import '../models/question.dart';
import '../models/evaluation.dart';

class ApiService {
  // CONFIGURABLE BASE URL - Change as needed:
  // Production: https://evaluation-backend-kaah.onrender.com
  // Local: http://192.168.1.100 (your computer IP)
  // Fallback: http://localhost:8080
  static String baseUrl = 'https://evaluation-backend-kaah.onrender.com';
  
  // Set custom base URL at runtime
  static void setBaseUrl(String url) {
    baseUrl = url;
    print('🔧 API Base URL changed to: $baseUrl');
  }
  
  static const Duration timeout = Duration(seconds: 30);
  
  // Check if device has internet connectivity
  static Future<bool> hasInternetConnection() async {
    try {
      final result = await InternetAddress.lookup('8.8.8.8');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    }
  }
  
  // Debug: Log connection attempts
  static void _logError(String endpoint, dynamic error) {
    print('❌ API Error on $endpoint: $error');
    if (error is SocketException) {
      print('   Socket Error: ${error.message}');
    }
  }

  // Get all teachers with retry logic
  static Future<List<Teacher>> getTeachers({int maxRetries = 2}) async {
    int retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        print('🔄 Fetching teachers from: $baseUrl/api/teachers (Attempt ${retryCount + 1}/${maxRetries + 1})');
        final response = await http
            .get(
              Uri.parse('$baseUrl/api/teachers'),
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
            )
            .timeout(timeout);

        if (response.statusCode == 200) {
          print('✅ Teachers loaded successfully');
          final dynamic responseBody = jsonDecode(response.body);
          
          // Handle nested response {success, message, data: {data: [...], pagination: {...}}}
          List<dynamic> data;
          if (responseBody is Map<String, dynamic> && responseBody.containsKey('data')) {
            final dataField = responseBody['data'];
            if (dataField is Map<String, dynamic> && dataField.containsKey('data')) {
              // Nested format: data.data contains the array
              final nestedData = dataField['data'];
              if (nestedData is List) {
                data = nestedData;
              } else {
                print('⚠️ Nested data is ${nestedData.runtimeType}, expected List');
                data = [];
              }
            } else if (dataField is List) {
              // Direct array in data field
              data = dataField;
            } else {
              throw Exception('Unexpected data field format: ${dataField.runtimeType}');
            }
          } else if (responseBody is List) {
            // Direct array format
            data = responseBody;
          } else {
            throw Exception('Unexpected response format: ${responseBody.runtimeType}');
          }
          
          print('📊 Parsed ${data.length} teachers from response');
          return data.map((teacher) => Teacher.fromJson(teacher)).toList();
        } else {
          _logError('getTeachers', 'Status: ${response.statusCode}');
          if (retryCount < maxRetries) {
            print('⚠️ Retrying... (Status: ${response.statusCode})');
            await Future.delayed(Duration(seconds: 2));
            retryCount++;
            continue;
          }
          throw Exception('Failed to load teachers: ${response.statusCode}');
        }
      } on SocketException catch (e) {
        print('❌ Network Error: ${e.message}');
        print('   Possible causes:');
        print('   - Render.com app might be sleeping (free tier)');
        print('   - Device has no internet connection');
        print('   - DNS lookup failed for $baseUrl');
        print('   - Firewall/VPN blocking the connection');
        
        if (retryCount < maxRetries) {
          print('⏳ Retrying in 2 seconds...');
          await Future.delayed(Duration(seconds: 2));
          retryCount++;
          continue;
        }
        throw Exception('Error loading teachers: Network error - ${e.message}');
      } catch (e) {
        _logError('getTeachers', e);
        if (retryCount < maxRetries) {
          print('⏳ Retrying in 2 seconds...');
          await Future.delayed(Duration(seconds: 2));
          retryCount++;
          continue;
        }
        throw Exception('Error loading teachers: $e');
      }
    }
    
    throw Exception('Failed to load teachers after $maxRetries retries');
  }

  // Get questions for evaluation
  static Future<List<Question>> getQuestions() async {
    try {
      print('🔄 Fetching questions from: $baseUrl/api/questions?limit=1000');
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/questions?limit=1000'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          )
          .timeout(timeout);

      if (response.statusCode == 200) {
        final dynamic responseBody = jsonDecode(response.body);
        print('📥 Questions response type: ${responseBody.runtimeType}');
        
        // Handle nested response {success, message, data: {data: [...], pagination: {...}}}
        List<dynamic> data;
        if (responseBody is Map<String, dynamic> && responseBody.containsKey('data')) {
          final dataField = responseBody['data'];
          print('📦 Data field type: ${dataField.runtimeType}');
          
          if (dataField is Map<String, dynamic> && dataField.containsKey('data')) {
            // Nested format: data.data contains the array
            final nestedData = dataField['data'];
            if (nestedData is List) {
              data = nestedData;
              print('✅ Parsed nested data: ${data.length} questions');
            } else {
              print('⚠️ Nested data is ${nestedData.runtimeType}, expected List');
              data = [];
            }
          } else if (dataField is List) {
            // Direct array in data field
            data = dataField;
            print('✅ Parsed direct array: ${data.length} questions');
          } else {
            throw Exception('Unexpected data field format: ${dataField.runtimeType}');
          }
        } else if (responseBody is List) {
          // Direct array format
          data = responseBody;
          print('✅ Parsed direct response array: ${data.length} questions');
        } else {
          throw Exception('Unexpected response format: ${responseBody.runtimeType}');
        }
        
        return data.map((question) => Question.fromJson(question)).toList();
      } else {
        throw Exception('Failed to load questions: ${response.statusCode}');
      }
    } on SocketException catch (e) {
      print('❌ Network Error loading questions: ${e.message}');
      throw Exception('Error loading questions: Network error - ${e.message}');
    } catch (e) {
      print('❌ Error loading questions: $e');
      throw Exception('Error loading questions: $e');
    }
  }

  // Submit evaluation with better error handling
  // Submit evaluation with enhanced error handling and retry logic (Phase 6)
  static Future<bool> submitEvaluation(Evaluation evaluation, {int maxRetries = 2}) async {
    int retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        print('📤 Submitting evaluation for teacher: ${evaluation.teacherId} (Attempt ${retryCount + 1}/${maxRetries + 1})');
        
        final response = await http
            .post(
              Uri.parse('$baseUrl/api/evaluations'),
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: jsonEncode(evaluation.toJson()),
            )
            .timeout(timeout);

        print('📥 Response status: ${response.statusCode}');
        print('📄 Response body: ${response.body}');

        if (response.statusCode == 200 || response.statusCode == 201) {
          try {
            final dynamic responseBody = jsonDecode(response.body);
            
            // Handle both wrapped response {success, message, data} and direct formats
            if (responseBody is Map<String, dynamic>) {
              if (responseBody['success'] == true) {
                print('✅ Evaluation submitted successfully');
                return true;
              } else {
                final errorMsg = responseBody['message'] ?? 'Unknown error';
                print('❌ Server returned error: $errorMsg');
                throw Exception('Server error: $errorMsg');
              }
            } else {
              print('✅ Evaluation submitted successfully (direct response)');
              return true;
            }
          } catch (parseError) {
            print('⚠️ Could not parse response, but status was successful: $parseError');
            return true; // Status was successful, treat as success
          }
        } else if (response.statusCode == 403) {
          // Evaluations disabled - don't retry
          print('❌ Evaluations disabled by admin (403)');
          throw Exception('Evaluations are currently disabled. Please try again later.');
        } else if (response.statusCode == 401) {
          // Student validation failed - don't retry
          print('❌ Student validation failed (401)');
          throw Exception('Invalid student information. Please log in again.');
        } else if (response.statusCode >= 500) {
          // Server error - might be temporary, can retry
          if (retryCount < maxRetries) {
            print('⏳ Server error (${response.statusCode}), retrying in 2 seconds...');
            await Future.delayed(Duration(seconds: 2));
            retryCount++;
            continue;
          }
          throw Exception('Server error: ${response.statusCode}. Please try again later.');
        } else {
          // Try to parse error response for better error message
          String errorMsg = 'Failed to submit evaluation: ${response.statusCode}';
          try {
            final dynamic responseBody = jsonDecode(response.body);
            if (responseBody is Map<String, dynamic>) {
              errorMsg = responseBody['message'] ?? responseBody['error'] ?? errorMsg;
            }
          } catch (e) {
            // Could not parse, use status code
          }
          
          print('❌ $errorMsg');
          print('📄 Full response: ${response.body}');
          throw Exception(errorMsg);
        }
      } on SocketException catch (e) {
        print('❌ Network Error: ${e.message}');
        print('   Device appears to be offline or network is unavailable');
        
        if (retryCount < maxRetries) {
          print('⏳ Retrying in 3 seconds...');
          await Future.delayed(Duration(seconds: 3));
          retryCount++;
          continue;
        }
        throw Exception('Network error: Unable to connect. Please check your internet connection.');
      } on TimeoutException catch (e) {
        print('❌ Timeout: Request took too long');
        
        if (retryCount < maxRetries) {
          print('⏳ Retrying in 3 seconds...');
          await Future.delayed(Duration(seconds: 3));
          retryCount++;
          continue;
        }
        throw Exception('Request timeout: Taking too long. Please check your connection and try again.');
      } catch (e) {
        print('❌ Error submitting evaluation: $e');
        if (retryCount < maxRetries) {
          print('⏳ Retrying in 2 seconds...');
          await Future.delayed(Duration(seconds: 2));
          retryCount++;
          continue;
        }
        throw Exception('Error submitting evaluation: $e');
      }
    }
    
    throw Exception('Failed to submit evaluation after $maxRetries retries. Please try again later.');
  }

  // Student login - matches React web auth/student-login endpoint
  static Future<Map<String, dynamic>> login(String studentNumber) async {
    try {
      print('🔄 Logging in student: $studentNumber');
      
      // Validate 10-digit format before sending
      if (!_validateStudentNumber(studentNumber)) {
        return {
          'success': false,
          'message': 'Student number must be exactly 10 digits (e.g., 2201010099)',
        };
      }
      
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/student-login'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'student_number': studentNumber.toUpperCase(),
            }),
          )
          .timeout(timeout);

      print('📥 Login response status: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        try {
          final dynamic responseBody = jsonDecode(response.body);
          
          if (responseBody is Map<String, dynamic>) {
            if (responseBody['success'] == true) {
              // Extract tokens from response (matches React web)
              final token = responseBody['token'] ?? '';
              final refreshToken = responseBody['refreshToken'] ?? '';
              print('✅ Login successful for student: $studentNumber');
              print('📝 Token: ${token.substring(0, 10)}...');
              
              return {
                'success': true,
                'message': 'Login successful',
                'token': token,
                'refreshToken': refreshToken,
                'user': responseBody['user'] ?? {'student_number': studentNumber, 'role': 'student'}
              };
            } else {
              final errorMsg = responseBody['message'] ?? 'Login failed';
              print('❌ Login error: $errorMsg');
              return {
                'success': false,
                'message': errorMsg,
              };
            }
          } else {
            throw Exception('Unexpected response format');
          }
        } catch (parseError) {
          print('❌ Error parsing login response: $parseError');
          return {
            'success': false,
            'message': 'Error parsing server response',
          };
        }
      } else if (response.statusCode == 401) {
        print('❌ Unauthorized: Invalid student number');
        return {
          'success': false,
          'message': 'Invalid student number',
        };
      } else if (response.statusCode == 404) {
        print('❌ Not found: Student number not found');
        return {
          'success': false,
          'message': 'Student number not found',
        };
      } else {
        // Try to parse error message
        String errorMsg = 'Login failed: ${response.statusCode}';
        try {
          final dynamic responseBody = jsonDecode(response.body);
          if (responseBody is Map<String, dynamic>) {
            errorMsg = responseBody['message'] ?? responseBody['error'] ?? errorMsg;
          }
        } catch (e) {
          // Use status code error
        }
        
        print('❌ $errorMsg');
        return {
          'success': false,
          'message': errorMsg,
        };
      }
    } on SocketException catch (e) {
      print('❌ Network error during login: ${e.message}');
      return {
        'success': false,
        'message': 'Network error: ${e.message}',
      };
    } catch (e) {
      print('❌ Login exception: $e');
      return {
        'success': false,
        'message': 'An error occurred during login',
      };
    }
  }

  // Validate 10-digit student number format (matches React web validation)
  static bool _validateStudentNumber(String studentNumber) {
    final cleaned = studentNumber.replaceAll(RegExp(r'\s+'), '');
    
    // Must be exactly 10 digits
    if (!RegExp(r'^\d{10}$').hasMatch(cleaned)) {
      return false;
    }
    
    // 10-digit format validation: YYSSPPDDXX
    final schoolYear = int.tryParse(cleaned.substring(0, 2)) ?? 0;
    final semester = cleaned.substring(2, 4);
    final department = int.tryParse(cleaned.substring(4, 6)) ?? 0;
    
    // School year: 22-26
    if (schoolYear < 22 || schoolYear > 26) return false;
    
    // Semester: 01 or 02
    if (semester != '01' && semester != '02') return false;
    
    // Department: 01-08
    if (department < 1 || department > 8) return false;
    
    return true;
  }

  // Check connection
  static Future<bool> checkConnection() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/teachers'),
          )
          .timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Get system settings (evaluation enabled/disabled)
  static Future<Map<String, dynamic>> getSettings() async {
    try {
      print('🔄 Fetching settings from: $baseUrl/api/settings');
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/settings'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          )
          .timeout(timeout);

      if (response.statusCode == 200) {
        print('✅ Settings loaded successfully');
        final dynamic responseBody = jsonDecode(response.body);
        
        if (responseBody is Map && responseBody['data'] != null) {
          return Map<String, dynamic>.from(responseBody['data']);
        }
        return {'eval_enabled': true}; // Default to enabled
      } else {
        print('⚠️ Settings API returned ${response.statusCode}');
        return {'eval_enabled': true}; // Default to enabled on error
      }
    } catch (e) {
      _logError('/api/settings', e);
      return {'eval_enabled': true}; // Default to enabled on error
    }
  }

  // NEW: Check if evaluation is enabled (Phase 3)
  // Shortcut for getSettings()['eval_enabled']
  static Future<bool> checkEvalEnabled() async {
    try {
      final settings = await getSettings();
      final enabled = settings['eval_enabled'] ?? true;
      print('📋 Evaluation enabled: $enabled');
      return enabled;
    } catch (e) {
      print('⚠️ Error checking eval_enabled, defaulting to true');
      return true;
    }
  }

  // NEW: Get evaluated teachers for a student (Phase 3 - Cross-device duplicate check)
  // Returns: {teacher_id: {teacher_name, rating, evaluated_at, positive_feedback, negative_feedback}, ...}
  static Future<Map<String, dynamic>> getEvaluatedTeachers(String studentNumber) async {
    try {
      print('🔍 Fetching evaluated teachers for student: $studentNumber');
      
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/evaluations/check-evaluated-teachers?student_number=$studentNumber'),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          )
          .timeout(timeout);

      if (response.statusCode == 200) {
        final dynamic responseBody = jsonDecode(response.body);
        
        // Handle nested response format
        Map<String, dynamic> evaluatedTeachers = {};
        
        if (responseBody is Map<String, dynamic>) {
          if (responseBody.containsKey('data') && responseBody['data'] is Map) {
            // Format: {data: {teacher_id: {...}, ...}}
            evaluatedTeachers = Map<String, dynamic>.from(responseBody['data']);
          } else if (responseBody.containsKey('evaluatedTeachers')) {
            // Alternative format: {evaluatedTeachers: {teacher_id: {...}, ...}}
            evaluatedTeachers = Map<String, dynamic>.from(responseBody['evaluatedTeachers']);
          } else {
            // Direct format: {teacher_id: {...}, ...}
            evaluatedTeachers = responseBody;
          }
        }
        
        print('✅ Found ${evaluatedTeachers.length} evaluated teachers');
        evaluatedTeachers.forEach((id, data) {
          print('   - $id: ${data['teacher_name'] ?? 'Unknown'}');
        });
        
        return evaluatedTeachers;
      } else if (response.statusCode == 404) {
        // No evaluations for this student
        print('ℹ️ No evaluations found for student $studentNumber');
        return {};
      } else {
        print('⚠️ Error fetching evaluated teachers: ${response.statusCode}');
        return {};
      }
    } on SocketException catch (e) {
      print('⚠️ Network error checking evaluated teachers: ${e.message}');
      return {}; // Return empty map (not evaluated) on network error
    } catch (e) {
      print('⚠️ Error checking evaluated teachers: $e');
      return {}; // Return empty map (not evaluated) on error
    }
  }
}

