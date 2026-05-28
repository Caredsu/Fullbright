import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'dart:async';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/evaluation_history_service.dart';
import '../models/teacher.dart';
import 'evaluation_screen.dart';

class TeacherListScreen extends StatefulWidget {
  const TeacherListScreen({Key? key}) : super(key: key);

  @override
  State<TeacherListScreen> createState() => _TeacherListScreenState();
}

class _TeacherListScreenState extends State<TeacherListScreen> {
  late Future<List<Teacher>> _teachersFuture;
  String _selectedDepartment = 'All';
  String _searchQuery = '';
  final List<String> _departments = ['All', 'ECT', 'EDUC', 'CCJE', 'BHT'];
  final AuthService _authService = AuthService();
  final EvaluationHistoryService _historyService = EvaluationHistoryService();
  bool _evalEnabled = true;
  Timer? _settingsCheckTimer;

  @override
  void initState() {
    super.initState();
    _checkAuthentication();
    _checkEvaluationEnabled();
    _loadTeachers();
    // Start polling for settings changes every 5 seconds
    _settingsCheckTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => _checkEvaluationEnabled(),
    );
  }

  @override
  void dispose() {
    _settingsCheckTimer?.cancel();
    super.dispose();
  }

  void _checkAuthentication() {
    if (!_authService.isAuthenticated()) {
      print('❌ User not authenticated, redirecting to login');
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  void _checkEvaluationEnabled() async {
    try {
      final settings = await ApiService.getSettings();
      setState(() {
        _evalEnabled = settings['eval_enabled'] ?? true;
      });
      print('📋 Evaluations ${_evalEnabled ? 'ENABLED' : 'DISABLED'}');
    } catch (e) {
      print('⚠️ Error checking evaluation status: $e');
      // Default to enabled if error
      setState(() {
        _evalEnabled = true;
      });
    }
  }

  void _loadTeachers() {
    setState(() {
      _teachersFuture = ApiService.getTeachers();
    });
  }

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Logout'),
          content: const Text('Are you sure you want to logout?'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                Navigator.of(context).pop();
                await _authService.logout();
                if (mounted) {
                  Navigator.of(context).pushReplacementNamed('/privacy');
                }
              },
              style: TextButton.styleFrom(
                foregroundColor: Colors.red,
              ),
              child: const Text('Logout'),
            ),
          ],
        );
      },
    );
  }

  List<Teacher> _filterTeachers(List<Teacher> teachers) {
    var filtered = teachers;

    // Filter by department
    if (_selectedDepartment != 'All') {
      filtered = filtered
          .where((t) => t.department == _selectedDepartment)
          .toList();
    }

    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      filtered = filtered
          .where((t) =>
              t.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              t.email.toLowerCase().contains(_searchQuery.toLowerCase()) ||
              t.department
                  .toLowerCase()
                  .contains(_searchQuery.toLowerCase()))
          .toList();
    }

    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('FBC EVAL - Teachers'),
        centerTitle: false,
        backgroundColor: const Color(0xFF1976D2),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTeachers,
            tooltip: 'Refresh',
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: const Color(0xFF1976D2),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search teachers...',
                hintStyle: const TextStyle(color: Colors.grey),
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
          ),

          // Department Filter
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 12,
            ),
            color: Colors.white,
            child: SizedBox(
              height: 40,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _departments.map((dept) {
                    final isSelected = _selectedDepartment == dept;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(dept),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            _selectedDepartment = dept;
                          });
                        },
                        backgroundColor: Colors.white,
                        selectedColor: const Color(0xFF1976D2),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : Colors.black87,
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                        ),
                        side: BorderSide(
                          color: isSelected
                              ? const Color(0xFF1976D2)
                              : Colors.grey.shade300,
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 0,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),

          // Recent Evaluations Section
          FutureBuilder<void>(
            future: _historyService.initialize(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.done) {
                final recentEvals = _historyService.getRecent(limit: 5);
                if (recentEvals.isNotEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(16),
                    color: const Color(0xFFF0F4F8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '📊 Recent Evaluations',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1976D2),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 90,
                          child: ListView.builder(
                            scrollDirection: Axis.horizontal,
                            itemCount: recentEvals.length,
                            itemBuilder: (context, index) {
                              final eval = recentEvals[index];
                              final submittedAt = DateTime.parse(eval['submittedAt'] as String);
                              final now = DateTime.now();
                              final diff = now.difference(submittedAt);
                              
                              String timeAgo;
                              if (diff.inMinutes < 1) {
                                timeAgo = 'just now';
                              } else if (diff.inHours < 1) {
                                timeAgo = '${diff.inMinutes}m ago';
                              } else if (diff.inDays < 1) {
                                timeAgo = '${diff.inHours}h ago';
                              } else {
                                timeAgo = '${diff.inDays}d ago';
                              }

                              return Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey.shade200),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      eval['teacherName'] as String,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${eval['ratingsCount']} ratings',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      timeAgo,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF1976D2),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  );
                }
              }
              return const SizedBox.shrink();
            },
          ),

          // Teachers List
          Expanded(
            child: !_evalEnabled
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.block_flipped,
                          size: 64,
                          color: Colors.orange,
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Evaluations are Currently Disabled',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'The administrator has disabled evaluations.\nPlease try again later.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _checkEvaluationEnabled,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Refresh'),
                        ),
                      ],
                    ),
                  )
                : FutureBuilder<List<Teacher>>(
                    future: _teachersFuture,
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Center(
                          child: CircularProgressIndicator(),
                        );
                      }

                      if (snapshot.hasError) {
                        return Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.error_outline,
                                size: 64,
                                color: Colors.red,
                              ),
                              const SizedBox(height: 16),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                child: Text(
                                  'Error: ${snapshot.error}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(color: Colors.red),
                                ),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton.icon(
                                onPressed: _loadTeachers,
                                icon: const Icon(Icons.refresh),
                                label: const Text('Retry'),
                              ),
                            ],
                          ),
                        );
                      }

                      if (!snapshot.hasData || snapshot.data!.isEmpty) {
                        return const Center(
                          child: Text('No teachers found'),
                        );
                      }

                      final teachers = _filterTeachers(snapshot.data!);

                      if (teachers.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.info_outline,
                                size: 64,
                                color: Colors.grey,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No teachers found',
                                style: const TextStyle(color: Colors.grey),
                              ),
                            ],
                          ),
                        );
                      }

                      return ListView.builder(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        itemCount: teachers.length,
                        itemBuilder: (context, index) {
                          final teacher = teachers[index];
                          return _buildTeacherCard(teacher);
                        },
                      );
                    },
                  ),
        ),
        ],
      ),
    );
  }

  Widget _buildTeacherCard(Teacher teacher) {
    final initial = teacher.name.isNotEmpty
        ? teacher.name[0].toUpperCase()
        : '?';
    
    // Check if teacher was already evaluated
    final wasEvaluated = _historyService.wasRecentlyEvaluated(teacher.id);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: wasEvaluated ? Colors.grey.shade300 : Colors.grey.shade200,
        ),
      ),
      elevation: wasEvaluated ? 0 : 1,
      child: InkWell(
        onTap: wasEvaluated
            ? null
            : () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => EvaluationScreen(teacher: teacher),
                  ),
                );
              },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Opacity(
            opacity: wasEvaluated ? 0.6 : 1.0,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Teacher Header with Avatar and Name
                Row(
                  children: [
                    // Avatar with Teacher Picture or Gradient Fallback
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: wasEvaluated ? Colors.grey.shade300 : Colors.grey.shade200,
                          width: 2,
                        ),
                      ),
                      child: teacher.profileImage != null && teacher.profileImage!.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: teacher.profileImage!,
                              imageBuilder: (context, imageProvider) => Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  image: DecorationImage(
                                    image: imageProvider,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                              placeholder: (context, url) => Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: wasEvaluated
                                        ? [Colors.grey.shade300, Colors.grey.shade400]
                                        : const [Color(0xFF8b5cf6), Color(0xFF06b6d4)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    initial,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 20,
                                    ),
                                  ),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                    colors: wasEvaluated
                                        ? [Colors.grey.shade300, Colors.grey.shade400]
                                        : const [Color(0xFF8b5cf6), Color(0xFF06b6d4)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                ),
                                child: Center(
                                  child: Text(
                                    initial,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 20,
                                    ),
                                  ),
                                ),
                              ),
                            )
                          : Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: wasEvaluated
                                      ? [Colors.grey.shade300, Colors.grey.shade400]
                                      : const [Color(0xFF8b5cf6), Color(0xFF06b6d4)],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  initial,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 20,
                                  ),
                                ),
                              ),
                            ),
                    ),
                    const SizedBox(width: 16),
                    // Name and Email
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            teacher.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: Colors.black,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            teacher.email,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Department and Status Badges
                Row(
                  children: [
                    // Department Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDBEAFE),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        teacher.department,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF0C4A6E),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Status Badge - Changes based on evaluation status
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: wasEvaluated
                            ? const Color(0xFFDEBEFE)
                            : const Color(0xFFD1FAE5),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (wasEvaluated)
                            const Icon(
                              Icons.check_circle,
                              size: 12,
                              color: Color(0xFF7C3AED),
                            )
                          else
                            const Icon(
                              Icons.circle,
                              size: 12,
                              color: Color(0xFF059669),
                            ),
                          const SizedBox(width: 4),
                          Text(
                            wasEvaluated ? 'Evaluated' : 'Active',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: wasEvaluated
                                  ? const Color(0xFF6D28D9)
                                  : const Color(0xFF065F46),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Evaluate Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: wasEvaluated
                        ? null
                        : () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) =>
                                    EvaluationScreen(teacher: teacher),
                              ),
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: wasEvaluated
                          ? Colors.grey.shade300
                          : const Color(0xFF1976D2),
                      disabledBackgroundColor: Colors.grey.shade300,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          wasEvaluated ? Icons.check : Icons.rate_review,
                          size: 16,
                          color: wasEvaluated ? Colors.grey.shade700 : Colors.white,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          wasEvaluated ? 'Already Evaluated' : 'Evaluate',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color:
                                wasEvaluated ? Colors.grey.shade700 : Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
