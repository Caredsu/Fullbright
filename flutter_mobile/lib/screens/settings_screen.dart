import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _urlController;
  late SharedPreferences _prefs;

  @override
  void initState() {
    super.initState();
    _urlController = TextEditingController(text: ApiService.baseUrl);
    _loadSavedUrl();
  }

  Future<void> _loadSavedUrl() async {
    _prefs = await SharedPreferences.getInstance();
    final savedUrl = _prefs.getString('api_base_url');
    if (savedUrl != null) {
      _urlController.text = savedUrl;
      ApiService.setBaseUrl(savedUrl);
    }
  }

  Future<void> _saveUrl(String url) async {
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL cannot be empty')),
      );
      return;
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('URL must start with http:// or https://')),
      );
      return;
    }

    await _prefs.setString('api_base_url', url);
    ApiService.setBaseUrl(url);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('API URL updated to: $url')),
    );
  }

  void _resetToDefault() {
    const defaultUrl = 'https://fullbright-college-1.onrender.com';
    _urlController.text = defaultUrl;
    _saveUrl(defaultUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'API Configuration',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Text(
              'Current API Base URL:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '••••••••••••••••',
                style: const TextStyle(fontSize: 12, fontFamily: 'monospace', letterSpacing: 2),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Quick Options:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            _urlOption(
              'Production',
              'https://fullbright-college-1.onrender.com',
            ),
            _urlOption(
              'Local Network (Option 1)',
              'http://192.168.1.100',
            ),
            _urlOption(
              'Local Network (Option 2)',
              'http://192.168.1.101',
            ),
            _urlOption(
              'Emulator',
              'http://10.0.2.2',
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Custom URL:',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: 'Enter API base URL',
                prefixIcon: const Icon(Icons.link),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _saveUrl(_urlController.text),
                    icon: const Icon(Icons.save),
                    label: const Text('Save URL'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _resetToDefault,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Reset'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Troubleshooting Tips:',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _tipCard(
              'Render Free Tier Sleep',
              'If using Render free tier, the app may sleep after 15 minutes of inactivity. Try accessing the URL in your browser first to wake it up.',
            ),
            _tipCard(
              'DNS Lookup Failed',
              'This error means the device cannot resolve the domain name. Check your internet connection and firewall settings.',
            ),
            _tipCard(
              'Local Network',
              'To test locally, find your computer\'s IP (run "ipconfig" on Windows) and use http://YOUR_IP_ADDRESS',
            ),
            _tipCard(
              'Certificate Error',
              'If you see an HTTPS certificate error, try using the HTTP version instead (if available).',
            ),
          ],
        ),
      ),
    );
  }

  Widget _urlOption(String label, String url) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: InkWell(
        onTap: () {
          _urlController.text = url;
          _saveUrl(url);
        },
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: ApiService.baseUrl == url ? Colors.blue[100] : Colors.transparent,
            border: Border.all(
              color: ApiService.baseUrl == url ? Colors.blue : Colors.grey[300]!,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                url,
                style: TextStyle(
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tipCard(String title, String description) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(8),
        border: Border(
          left: BorderSide(color: Colors.blue[400]!, width: 4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            description,
            style: TextStyle(fontSize: 11, color: Colors.grey[700]),
          ),
        ],
      ),
    );
  }
}
