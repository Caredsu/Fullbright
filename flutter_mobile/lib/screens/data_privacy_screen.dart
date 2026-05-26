import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/auth_service.dart';
import 'student_login_screen.dart';

class DataPrivacyScreen extends StatefulWidget {
  const DataPrivacyScreen({Key? key}) : super(key: key);

  @override
  State<DataPrivacyScreen> createState() => _DataPrivacyScreenState();
}

class _DataPrivacyScreenState extends State<DataPrivacyScreen> {
  bool _agreedToTerms = false;
  bool _isProcessing = false;
  final AuthService _authService = AuthService();

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
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: const Color(0xFF1976D2).withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.school,
                        size: 50,
                        color: Color(0xFF1976D2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Title
                  const Center(
                    child: Text(
                      'Data Privacy Notice',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1F2937),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  
                  // Subtitle
                  const Center(
                    child: Text(
                      'Please review our data handling practices',
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                  
                  // Privacy policy content
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: const Color(0xFFE5E7EB),
                      ),
                    ),
                    child: const SingleChildScrollView(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Information We Collect',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• Student identification number\n'
                            '• Teacher evaluation responses\n'
                            '• Evaluation timestamps\n'
                            '• Device information (for app analytics)',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563),
                              height: 1.6,
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'How We Use Your Data',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• To collect and process teacher evaluations\n'
                            '• To improve our educational services\n'
                            '• For academic research purposes\n'
                            '• To ensure data security and prevent abuse',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563),
                              height: 1.6,
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Data Protection',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• All data is encrypted in transit\n'
                            '• Data is stored securely on our servers\n'
                            '• Only authorized staff have access\n'
                            '• Data is never shared with third parties',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563),
                              height: 1.6,
                            ),
                          ),
                          SizedBox(height: 16),
                          Text(
                            'Your Rights',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1F2937),
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            '• You can withdraw consent at any time\n'
                            '• Request access to your data\n'
                            '• Request deletion of your data\n'
                            '• Contact us with privacy concerns',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFF4B5563),
                              height: 1.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Checkbox for agreement
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: _agreedToTerms
                            ? const Color(0xFF1976D2)
                            : const Color(0xFFE5E7EB),
                        width: 2,
                      ),
                    ),
                    child: CheckboxListTile(
                      value: _agreedToTerms,
                      onChanged: (value) {
                        setState(() {
                          _agreedToTerms = value ?? false;
                        });
                      },
                      title: const Text(
                        'I have read and agree to the data privacy notice',
                        style: TextStyle(
                          fontSize: 13,
                          color: Color(0xFF1F2937),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      controlAffinity: ListTileControlAffinity.leading,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _isProcessing
                              ? null
                              : () {
                                  SystemNavigator.pop();
                                },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFFE5E7EB)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text(
                            'Disagree',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _agreedToTerms && !_isProcessing
                              ? _handleAgree
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1976D2),
                            disabledBackgroundColor: const Color(0xFFD1D5DB),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: _isProcessing
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor:
                                        AlwaysStoppedAnimation<Color>(
                                      Colors.white,
                                    ),
                                  ),
                                )
                              : const Text(
                                  'I Agree',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _handleAgree() async {
    setState(() {
      _isProcessing = true;
    });

    try {
      final success = await _authService.acceptPrivacy();
      
      if (success && mounted) {
        // Navigate to StudentLoginScreen
        Navigator.of(context).pushReplacementNamed('/login');
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to accept privacy consent. Please try again.'),
            backgroundColor: Color(0xFFDC2626),
          ),
        );
        setState(() {
          _isProcessing = false;
        });
      }
    } catch (e) {
      print('❌ Error accepting privacy: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('An error occurred. Please try again.'),
            backgroundColor: Color(0xFFDC2626),
          ),
        );
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }
}
