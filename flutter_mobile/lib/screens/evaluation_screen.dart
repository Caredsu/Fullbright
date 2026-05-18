import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/teacher.dart';
import '../models/question.dart';
import '../models/evaluation.dart';

class EvaluationScreen extends StatefulWidget {
  final Teacher teacher;

  const EvaluationScreen({Key? key, required this.teacher}) : super(key: key);

  @override
  State<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends State<EvaluationScreen> {
  late Future<List<Question>> _questionsFuture;
  Map<String, dynamic> _ratings = {};
  String _feedbackComments = '';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _questionsFuture = ApiService.getQuestions();
  }

  Future<void> _submitEvaluation() async {
    if (_ratings.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please rate at least one criterion')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final evaluation = Evaluation(
        teacherId: widget.teacher.id,
        ratings: _ratings,
        feedbackComments: _feedbackComments.isEmpty ? null : _feedbackComments,
        submittedAt: DateTime.now(),
      );

      final success = await ApiService.submitEvaluation(evaluation);

      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Evaluation submitted successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() {
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Evaluate ${widget.teacher.name}'),
        backgroundColor: const Color(0xFF1976D2),
      ),
      body: FutureBuilder<List<Question>>(
        future: _questionsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (snapshot.hasError) {
            return Center(
              child: Text('Error: ${snapshot.error}'),
            );
          }

          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(
              child: Text('No questions available'),
            );
          }

          final questions = snapshot.data!;

          return SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Teacher Info Card
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: const Color(0xFF1976D2),
                                radius: 30,
                                child: Text(
                                  widget.teacher.name.isNotEmpty
                                      ? widget.teacher.name[0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      widget.teacher.name,
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      widget.teacher.department,
                                      style: const TextStyle(
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    'Evaluation Criteria',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Questions
                  ...questions.map((question) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 20),
                      child: _buildQuestionWidget(question),
                    );
                  }).toList(),
                  // Feedback Comments
                  const SizedBox(height: 8),
                  const Text(
                    'Additional Comments (Optional)',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    maxLines: 4,
                    decoration: InputDecoration(
                      hintText: 'Share your feedback...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onChanged: (value) {
                      setState(() {
                        _feedbackComments = value;
                      });
                    },
                  ),
                  const SizedBox(height: 20),
                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitEvaluation,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1976D2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Text(
                              'Submit Evaluation',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildQuestionWidget(Question question) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              question.text,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 12),
            if (question.type == 'rating' || question.type == 'scale')
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(5, (index) {
                  final rating = index + 1;
                  final isSelected =
                      _ratings[question.id] == rating;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _ratings[question.id] = rating;
                      });
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isSelected
                            ? const Color(0xFF1976D2)
                            : Colors.grey.shade200,
                      ),
                      child: Center(
                        child: Text(
                          '$rating',
                          style: TextStyle(
                            color: isSelected ? Colors.white : Colors.black,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              )
            else if (question.type == 'multiple_choice' &&
                question.options != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: question.options!
                    .map((option) {
                      final isSelected = _ratings[question.id] == option;
                      return RadioListTile<String>(
                        title: Text(option),
                        value: option,
                        groupValue: _ratings[question.id],
                        onChanged: (value) {
                          setState(() {
                            _ratings[question.id] = value;
                          });
                        },
                      );
                    })
                    .toList()
                    .cast<Widget>(),
              )
            else
              TextField(
                decoration: InputDecoration(
                  hintText: 'Your answer...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                onChanged: (value) {
                  setState(() {
                    _ratings[question.id] = value;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }
}
