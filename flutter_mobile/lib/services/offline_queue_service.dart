import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/evaluation.dart';
import 'api_service.dart';

/// Phase 7: Offline Submission Queue Service
/// Queues failed submissions and syncs when connection restored
class OfflineQueueService {
  static const String _queueKey = 'offline_submission_queue';
  static const String _lastSyncKey = 'last_sync_time';
  
  /// Check if internet is available
  static Future<bool> isOnline() async {
    return await ApiService.hasInternetConnection();
  }
  
  /// Add submission to offline queue
  static Future<void> queueSubmission(Evaluation evaluation) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // Get existing queue
      final queueJson = prefs.getString(_queueKey);
      final queue = queueJson != null 
          ? List<Map<String, dynamic>>.from(jsonDecode(queueJson))
          : [];
      
      // Add new submission with timestamp
      queue.add({
        'evaluation': evaluation.toJson(),
        'queuedAt': DateTime.now().toIso8601String(),
        'retryCount': 0,
      });
      
      // Save queue
      await prefs.setString(_queueKey, jsonEncode(queue));
      print('📥 Submission queued for offline sync (total: ${queue.length})');
    } catch (e) {
      print('❌ Error queuing submission: $e');
    }
  }
  
  /// Get queued submissions count
  static Future<int> getQueueLength() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_queueKey);
      if (queueJson == null) return 0;
      
      final queue = List<Map<String, dynamic>>.from(jsonDecode(queueJson));
      return queue.length;
    } catch (e) {
      print('❌ Error getting queue length: $e');
      return 0;
    }
  }
  
  /// Sync all queued submissions when online
  /// Returns number of successfully synced submissions
  static Future<int> syncQueuedSubmissions() async {
    try {
      // Check if online
      final online = await isOnline();
      if (!online) {
        print('⚠️ Still offline, skipping sync');
        return 0;
      }
      
      print('🔄 Starting offline queue sync...');
      
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_queueKey);
      
      if (queueJson == null || queueJson.isEmpty) {
        print('✅ No queued submissions to sync');
        return 0;
      }
      
      final queue = List<Map<String, dynamic>>.from(jsonDecode(queueJson));
      int successCount = 0;
      final failedQueue = <Map<String, dynamic>>[];
      
      for (int i = 0; i < queue.length; i++) {
        final item = queue[i];
        final evaluationJson = item['evaluation'];
        final retryCount = (item['retryCount'] ?? 0) as int;
        
        try {
          // Convert back to Evaluation object
          final evaluation = Evaluation.fromJson(evaluationJson);
          
          // Try to submit (with retries)
          print('📤 Syncing queued submission ${i + 1}/${queue.length}...');
          final success = await ApiService.submitEvaluation(evaluation);
          
          if (success) {
            print('✅ Synced queued submission ${i + 1}/${queue.length}');
            successCount++;
          } else {
            // Retry later
            item['retryCount'] = retryCount + 1;
            failedQueue.add(item);
          }
        } catch (e) {
          print('❌ Error syncing submission ${i + 1}: $e');
          
          // Keep in queue for retry (max 3 retries)
          if (retryCount < 3) {
            item['retryCount'] = retryCount + 1;
            failedQueue.add(item);
          } else {
            // Give up after 3 retries
            print('⚠️ Dropped submission after 3 retries');
          }
        }
      }
      
      // Update queue with failed items
      if (failedQueue.isEmpty) {
        await prefs.remove(_queueKey);
        print('✅ Offline queue cleared - all synced!');
      } else {
        await prefs.setString(_queueKey, jsonEncode(failedQueue));
        print('⚠️ ${failedQueue.length} submissions remain in queue');
      }
      
      // Update last sync time
      await prefs.setString(_lastSyncKey, DateTime.now().toIso8601String());
      
      return successCount;
    } catch (e) {
      print('❌ Error during sync: $e');
      return 0;
    }
  }
  
  /// Clear the offline queue (use with caution)
  static Future<void> clearQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_queueKey);
      print('🗑️ Offline queue cleared');
    } catch (e) {
      print('❌ Error clearing queue: $e');
    }
  }
  
  /// Get queue status for UI display
  static Future<Map<String, dynamic>> getQueueStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_queueKey);
      final lastSyncJson = prefs.getString(_lastSyncKey);
      
      if (queueJson == null) {
        return {
          'queuedCount': 0,
          'isOnline': await isOnline(),
          'lastSync': null,
        };
      }
      
      final queue = List<Map<String, dynamic>>.from(jsonDecode(queueJson));
      
      return {
        'queuedCount': queue.length,
        'isOnline': await isOnline(),
        'lastSync': lastSyncJson != null ? DateTime.parse(lastSyncJson) : null,
      };
    } catch (e) {
      print('❌ Error getting queue status: $e');
      return {
        'queuedCount': 0,
        'isOnline': false,
        'lastSync': null,
      };
    }
  }
}
