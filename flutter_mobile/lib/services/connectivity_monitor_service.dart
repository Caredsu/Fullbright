import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'offline_queue_service.dart';

/// Phase 7: Connectivity Monitor Service
/// Monitors network connectivity and auto-syncs queued submissions
class ConnectivityMonitorService {
  static final ConnectivityMonitorService _instance = ConnectivityMonitorService._internal();
  static bool _isMonitoring = false;
  static Timer? _checkTimer;
  static VoidCallback? _onSyncCallback;

  factory ConnectivityMonitorService() {
    return _instance;
  }

  ConnectivityMonitorService._internal();

  /// Start monitoring connectivity
  /// Call onSync callback when sync completes
  static Future<void> startMonitoring({VoidCallback? onSync}) async {
    if (_isMonitoring) {
      print('⚠️ Connectivity monitor already running');
      return;
    }

    _isMonitoring = true;
    _onSyncCallback = onSync;

    print('🔍 Starting connectivity monitor...');

    // Check connectivity every 30 seconds
    _checkTimer = Timer.periodic(Duration(seconds: 30), (_) async {
      await _checkAndSync();
    });

    // Also check immediately
    await _checkAndSync();
  }

  /// Stop monitoring connectivity
  static void stopMonitoring() {
    if (!_isMonitoring) return;

    _checkTimer?.cancel();
    _isMonitoring = false;
    _onSyncCallback = null;

    print('🛑 Stopped connectivity monitor');
  }

  /// Check connectivity and sync if online
  static Future<void> _checkAndSync() async {
    try {
      final isOnline = await OfflineQueueService.isOnline();

      if (!isOnline) {
        print('📡 Offline - skipping sync check');
        return;
      }

      print('📡 Online detected - checking for queued submissions...');

      final queueLength = await OfflineQueueService.getQueueLength();

      if (queueLength == 0) {
        print('✅ No queued submissions');
        return;
      }

      print('🔄 Found $queueLength queued submissions - syncing...');

      final syncedCount = await OfflineQueueService.syncQueuedSubmissions();

      print('✅ Synced $syncedCount/$queueLength submissions');

      // Call callback to update UI if needed
      if (syncedCount > 0 && _onSyncCallback != null) {
        _onSyncCallback!();
      }
    } catch (e) {
      print('❌ Error during connectivity check/sync: $e');
    }
  }

  /// Get current connectivity status
  static Future<bool> isOnline() async {
    return await OfflineQueueService.isOnline();
  }

  /// Manually trigger sync
  static Future<int> syncNow() async {
    print('🔄 Manual sync triggered');
    return await OfflineQueueService.syncQueuedSubmissions();
  }
}
