import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'teacher_list_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  final AuthService _authService = AuthService();

  @override
  void initState() {
    super.initState();
    _navigateBasedOnAuth();
  }

  _navigateBasedOnAuth() async {
    // Initialize AuthService first
    await _authService.initialize();

    // Simulate loading time
    await Future.delayed(const Duration(seconds: 2), () {});

    if (!mounted) return;

    // Check auth state and navigate accordingly
    if (_authService.isAuthenticated()) {
      // User is already logged in, go to teacher list
      print('✅ User already authenticated, navigating to teacher list');
      Navigator.of(context).pushReplacementNamed('/teacher-list');
    } else if (_authService.isConsentGiven()) {
      // User has accepted privacy, go to login
      print('✅ Privacy consent given, navigating to student login');
      Navigator.of(context).pushReplacementNamed('/login');
    } else {
      // First time user, go to privacy screen
      print('🔄 First time user, navigating to data privacy screen');
      Navigator.of(context).pushReplacementNamed('/privacy');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1976D2),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.school,
                size: 60,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 30),
            const Text(
              'Teacher Evaluation',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 15),
            const Text(
              'Loading...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 30),
            const SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                strokeWidth: 3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
