import 'package:flutter/material.dart';

class ToastService {
  static void showSuccess(BuildContext context, String message) {
    _showToast(
      context,
      message,
      const Color(0xFF10B981),
      Icons.check_circle,
      duration: const Duration(seconds: 3),
    );
  }

  static void showError(BuildContext context, String message) {
    _showToast(
      context,
      message,
      const Color(0xFFEF4444),
      Icons.error,
      duration: const Duration(seconds: 4),
    );
  }

  static void showWarning(BuildContext context, String message) {
    _showToast(
      context,
      message,
      const Color(0xFFF59E0B),
      Icons.warning,
      duration: const Duration(seconds: 3),
    );
  }

  static void showInfo(BuildContext context, String message) {
    _showToast(
      context,
      message,
      const Color(0xFF3B82F6),
      Icons.info,
      duration: const Duration(seconds: 3),
    );
  }

  static void _showToast(
    BuildContext context,
    String message,
    Color color,
    IconData icon, {
    Duration duration = const Duration(seconds: 3),
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        top: MediaQuery.of(context).padding.top + 16,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0, -1),
              end: Offset.zero,
            ).animate(
              CurvedAnimation(
                parent: AnimationController(
                  duration: const Duration(milliseconds: 300),
                  vsync: Scaffold.of(context),
                ),
                curve: Curves.easeOut,
              ),
            ),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Icon(
                    icon,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      message,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    Future.delayed(duration, () {
      overlayEntry.remove();
    });
  }
}
