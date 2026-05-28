import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/data_privacy_screen.dart';
import 'screens/student_login_screen.dart';
import 'screens/teacher_list_screen.dart';
import 'services/connectivity_monitor_service.dart'; // NEW: Phase 7

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    // Phase 7: Start connectivity monitor for offline sync
    _startConnectivityMonitor();
  }

  Future<void> _startConnectivityMonitor() async {
    try {
      await ConnectivityMonitorService.startMonitoring(
        onSync: () {
          print('📲 Sync completed - updating UI');
          // Could trigger UI update here if needed
        },
      );
    } catch (e) {
      print('❌ Error starting connectivity monitor: $e');
    }
  }

  @override
  void dispose() {
    ConnectivityMonitorService.stopMonitoring();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FBC EVAL',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        primaryColor: const Color(0xFF1976D2),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
      routes: {
        '/privacy': (context) => const DataPrivacyScreen(),
        '/login': (context) => const StudentLoginScreen(),
        '/teacher-list': (context) => const TeacherListScreen(),
      },
    );
  }
}
