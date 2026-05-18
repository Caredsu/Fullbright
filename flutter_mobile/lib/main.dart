import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/teacher_list_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

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
        '/teacher-list': (context) => const TeacherListScreen(),
      },
    );
  }
}
