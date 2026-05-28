import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class StudentLoginScreen extends StatefulWidget {
  const StudentLoginScreen({Key? key}) : super(key: key);

  @override
  State<StudentLoginScreen> createState() => _StudentLoginScreenState();
}

class _StudentLoginScreenState extends State<StudentLoginScreen> {
  final _studentNumberController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  String _errorMessage = '';
  final AuthService _authService = AuthService();

  @override
  void dispose() {
    _studentNumberController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        // Prevent back button
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: SafeArea(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header with logo
                  Center(
                    child: Image.asset(
                      'assets/images/fbc_logo2.png',
                      width: 100,
                      height: 100,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title
                  const Center(
                    child: Text(
                      'Student Login',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Form
                  Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Error message
                        if (_errorMessage.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFFFECACA),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.error_outline,
                                  color: Color(0xFFDC2626),
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _errorMessage,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFFDC2626),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        if (_errorMessage.isNotEmpty)
                          const SizedBox(height: 16),
                        
                        // Loading alert message
                        if (_isLoading)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: const Color(0xFFBFDBFE),
                              ),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      Color(0xFF1976D2),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                const Expanded(
                                  child: Text(
                                    'Verifying your student number...',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Color(0xFF1976D2),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        if (_isLoading)
                          const SizedBox(height: 16),

                        // Student Number Label
                        const Text(
                          'Student Number',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Student Number Input
                        TextFormField(
                          controller: _studentNumberController,
                          enabled: !_isLoading,
                          textCapitalization: TextCapitalization.characters,
                          keyboardType: TextInputType.text,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) {
                            if (!_isLoading) {
                              _handleLogin();
                            }
                          },
                          decoration: InputDecoration(
                            hintText: 'Enter your student number',
                            hintStyle: const TextStyle(
                              color: Color(0xFFD1D5DB),
                            ),
                            prefixIcon: const Icon(
                              Icons.badge,
                              color: Color(0xFF1976D2),
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFFE5E7EB),
                              ),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFFE5E7EB),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFF1976D2),
                                width: 2,
                              ),
                            ),
                            disabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(
                                color: Color(0xFFF3F4F6),
                              ),
                            ),
                            filled: true,
                            fillColor: Colors.white,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 14,
                            ),
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Student Number is required';
                            }
                            
                            final cleaned = value.replaceAll(RegExp(r'\s+'), '');
                            
                            // Must be exactly 10 digits
                            if (!RegExp(r'^\d{10}$').hasMatch(cleaned)) {
                              return 'Student number must be exactly 10 digits (e.g., 2201010099)';
                            }
                            
                            // 10-digit format validation: YYSSPPDDXX
                            final schoolYear = int.tryParse(cleaned.substring(0, 2)) ?? 0;
                            final semester = cleaned.substring(2, 4);
                            final department = int.tryParse(cleaned.substring(4, 6)) ?? 0;
                            
                            // School year: 22-26
                            if (schoolYear < 22 || schoolYear > 26) {
                              return 'Invalid school year in student number (must be 22-26)';
                            }
                            
                            // Semester: 01 or 02
                            if (semester != '01' && semester != '02') {
                              return 'Invalid semester in student number';
                            }
                            
                            // Department: 01-08
                            if (department < 1 || department > 8) {
                              return 'Invalid department in student number';
                            }
                            
                            return null;
                          },
                          onChanged: (value) {
                            if (_errorMessage.isNotEmpty) {
                              setState(() {
                                _errorMessage = '';
                              });
                            }
                          },
                        ),
                        const SizedBox(height: 24),

                        // Login Button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1976D2),
                              disabledBackgroundColor: const Color(0xFFD1D5DB),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: _isLoading
                                ? const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            Colors.white,
                                          ),
                                        ),
                                      ),
                                      SizedBox(width: 12),
                                      Text(
                                        'Verifying...',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ],
                                  )
                                : const Text(
                                    'Get Started',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _handleLogin() async {
    // Clear previous error
    setState(() {
      _errorMessage = '';
    });

    // Validate form
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Step 1: Set loading FIRST, BEFORE any async work
    print('Step 1: Setting loading = true');
    setState(() {
      _isLoading = true;
    });

    // Step 2: Use a delay to ensure the DOM has rendered with loading state
    // before we proceed with the async login call (matches React web)
    Future.delayed(const Duration(seconds: 2), () async {
      try {
        print('Step 2: Calling login...');
        final studentNumber = _studentNumberController.text.trim().toUpperCase();
        
        // Call API to login
        final response = await ApiService.login(studentNumber);
        print('Step 3: Login result: ${response['success']}');

        if (!mounted) return;

        if (response['success'] == true) {
          // Extract tokens from response (matches React web)
          final token = response['token'] ?? '';
          final refreshToken = response['refreshToken'] ?? '';
          
          if (token.isEmpty) {
            throw Exception('No token received from server');
          }

          // Save login data with refresh token
          final saveSuccess = await _authService.login(
            studentNumber,
            token,
            refreshToken: refreshToken,
          );
          
          if (saveSuccess) {
            print('Step 4: Login successful, waiting 3 seconds...');
            // Wait 3 more seconds (total visible time will be ~3+ seconds)
            await Future.delayed(const Duration(seconds: 3));
            
            if (!mounted) return;
            print('Step 5: Redirecting to dashboard');
            Navigator.of(context).pushReplacementNamed('/teacher-list');
          } else {
            throw Exception('Failed to save login data');
          }
        } else {
          // Login failed
          final errorMsg = response['message'] ?? 'Login failed. Please try again.';
          if (mounted) {
            setState(() {
              _errorMessage = errorMsg;
              _isLoading = false;
            });
          }
          print('❌ Login error: $errorMsg');
        }
      } catch (e) {
        print('❌ Login exception: $e');
        if (mounted) {
          setState(() {
            _errorMessage = _getErrorMessage(e.toString());
            _isLoading = false;
          });
        }
      }
    });
  }

  String _getErrorMessage(String error) {
    if (error.contains('Network')) {
      return 'Network error. Please check your connection.';
    } else if (error.contains('timeout')) {
      return 'Request timeout. Please try again.';
    } else if (error.contains('not found')) {
      return 'Student number not found.';
    } else if (error.contains('unauthorized')) {
      return 'Invalid student number.';
    } else {
      return 'An error occurred. Please try again.';
    }
  }
}
