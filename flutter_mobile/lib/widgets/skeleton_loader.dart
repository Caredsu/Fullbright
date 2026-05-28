import 'package:flutter/material.dart';

/// Phase 8: Skeleton Loader Widgets
/// Provides smooth loading states for async operations

class SkeletonLoader extends StatefulWidget {
  final double width;
  final double height;
  final BorderRadius borderRadius;
  final EdgeInsets margin;

  const SkeletonLoader({
    Key? key,
    this.width = double.infinity,
    this.height = 16,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
    this.margin = EdgeInsets.zero,
  }) : super(key: key);

  @override
  State<SkeletonLoader> createState() => _SkeletonLoaderState();
}

class _SkeletonLoaderState extends State<SkeletonLoader>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: Duration(milliseconds: 1000),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: widget.margin,
      child: FadeTransition(
        opacity: Tween<double>(begin: 0.3, end: 0.6).animate(_animationController),
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: widget.borderRadius,
          ),
        ),
      ),
    );
  }
}

class SkeletonQuestionCard extends StatelessWidget {
  const SkeletonQuestionCard({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question text
            SkeletonLoader(
              height: 20,
              margin: const EdgeInsets.only(bottom: 16),
            ),
            SkeletonLoader(
              height: 16,
              width: 280,
              margin: const EdgeInsets.only(bottom: 24),
            ),
            // Rating buttons skeleton
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(
                5,
                (index) => SkeletonLoader(
                  width: 50,
                  height: 50,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SkeletonSetHeader extends StatelessWidget {
  const SkeletonSetHeader({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SkeletonLoader(
          height: 24,
          width: 200,
          margin: const EdgeInsets.only(bottom: 12),
        ),
        SkeletonLoader(
          height: 16,
          width: 300,
          margin: const EdgeInsets.only(bottom: 16),
        ),
      ],
    );
  }
}

class SkeletonProgressBar extends StatelessWidget {
  const SkeletonProgressBar({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            SkeletonLoader(
              height: 16,
              width: 120,
            ),
            SkeletonLoader(
              height: 16,
              width: 80,
            ),
          ],
        ),
        const SizedBox(height: 12),
        SkeletonLoader(
          height: 8,
          width: double.infinity,
          borderRadius: BorderRadius.circular(4),
        ),
      ],
    );
  }
}

class SkeletonEvaluationScreen extends StatelessWidget {
  const SkeletonEvaluationScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Teacher info skeleton
            SkeletonLoader(
              height: 100,
              margin: const EdgeInsets.only(bottom: 20),
              borderRadius: BorderRadius.circular(12),
            ),
            // Progress bar skeleton
            SkeletonProgressBar(),
            const SizedBox(height: 20),
            // Set header skeleton
            SkeletonSetHeader(),
            const SizedBox(height: 20),
            // Questions skeleton
            SkeletonQuestionCard(),
            const SizedBox(height: 16),
            SkeletonQuestionCard(),
            const SizedBox(height: 16),
            SkeletonQuestionCard(),
            const SizedBox(height: 20),
            // Submit button skeleton
            SkeletonLoader(
              height: 50,
              width: double.infinity,
              borderRadius: BorderRadius.circular(8),
            ),
          ],
        ),
      ),
    );
  }
}
