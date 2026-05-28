import 'package:flutter/material.dart';
import 'dart:async';

class SuccessScreen extends StatefulWidget {
  final String teacherName;
  final VoidCallback? onAutoRedirect;

  const SuccessScreen({
    Key? key,
    required this.teacherName,
    this.onAutoRedirect,
  }) : super(key: key);

  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen>
    with TickerProviderStateMixin {
  late Timer _redirectTimer;
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  int _secondsRemaining = 3;

  @override
  void initState() {
    super.initState();

    // Setup scale animation for checkmark
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..forward();

    // Setup fade animation
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    )..forward();

    // Start countdown and auto-redirect after 3 seconds
    _startCountdown();
  }

  void _startCountdown() {
    _redirectTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _secondsRemaining--;
      });

      if (_secondsRemaining <= 0) {
        _redirectTimer.cancel();
        _performRedirect();
      }
    });
  }

  void _performRedirect() {
    widget.onAutoRedirect?.call();

    // Navigate back to teachers list (pop twice to get past evaluation screen)
    if (mounted) {
      Navigator.of(context).pop();
      Navigator.of(context).pop();
    }
  }

  @override
  void dispose() {
    _redirectTimer.cancel();
    _scaleController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        _redirectTimer.cancel();
        Navigator.of(context).pop();
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1976D2),
        body: Stack(
          children: [
            // Animated background particles (NEW)
            ..._buildParticles(),

            // Success content
            Center(
              child: FadeTransition(
                opacity: _fadeController,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Large checkmark with scale animation (NEW)
                    ScaleTransition(
                      scale: Tween<double>(begin: 0.0, end: 1.0).animate(
                        CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
                      ),
                      child: Container(
                        width: 100,
                        height: 100,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 20,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.check,
                          size: 60,
                          color: Color(0xFF1976D2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Success title
                    const Text(
                      '✅ Evaluation Submitted!',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),

                    // Teacher name
                    Text(
                      'Thank you for evaluating\n${widget.teacherName}',
                      style: const TextStyle(
                        fontSize: 16,
                        color: Colors.white70,
                        height: 1.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 40),

                    // Auto-redirect countdown (NEW)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.3),
                        ),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Redirecting in',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '$_secondsRemaining second${_secondsRemaining != 1 ? 's' : ''}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),

                    // Manual go back button (NEW)
                    ElevatedButton.icon(
                      onPressed: () {
                        _redirectTimer.cancel();
                        _performRedirect();
                      },
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('Continue'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1976D2),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 12,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build animated background particles (NEW: Phase 5 celebration effect)
  List<Widget> _buildParticles() {
    final particles = <Widget>[];
    final random = DateTime.now().microsecond % 5;

    // Create 3-5 floating particles for celebration effect
    for (int i = 0; i < random + 3; i++) {
      particles.add(
        Positioned(
          left: (i * 80.0) % 400,
          top: (i * 60.0) % 600,
          child: Opacity(
            opacity: 0.1,
            child: Icon(
              Icons.star,
              size: 40 + (i * 10).toDouble(),
              color: Colors.white,
            ),
          ),
        ),
      );
    }

    return particles;
  }
}
