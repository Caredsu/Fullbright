import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

function Settings() {
  const [settings, setSettings] = useState({
    system_name: 'Teacher Evaluation System',
    system_email: 'admin@system.local',
    support_email: 'support@system.local',
    eval_enabled: '1',
    min_rating: '1',
    max_rating: '5'
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate saving - in a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 500));
      setSuccessMsg('Settings saved successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">System Settings</h2>
        <p className="text-muted-foreground">Manage system configuration and evaluation settings</p>
      </div>

      {successMsg && <div className="bg-green-50 text-green-800 p-3 rounded-lg mb-4">{successMsg}</div>}

      {/* General Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="system_name">System Name</Label>
            <Input
              id="system_name"
              value={settings.system_name}
              onChange={(e) => handleChange('system_name', e.target.value)}
              placeholder="Enter system name"
            />
          </div>

          <div>
            <Label htmlFor="system_email">System Email</Label>
            <Input
              id="system_email"
              type="email"
              value={settings.system_email}
              onChange={(e) => handleChange('system_email', e.target.value)}
              placeholder="Enter system email"
            />
          </div>

          <div>
            <Label htmlFor="support_email">Support Email</Label>
            <Input
              id="support_email"
              type="email"
              value={settings.support_email}
              onChange={(e) => handleChange('support_email', e.target.value)}
              placeholder="Enter support email"
            />
          </div>
        </CardContent>
      </Card>

      {/* Evaluation Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Evaluation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="eval_enabled">Enable Evaluations</Label>
            <select
              id="eval_enabled"
              className="w-full rounded-md border border-input px-3 py-2"
              value={settings.eval_enabled}
              onChange={(e) => handleChange('eval_enabled', e.target.value)}
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>

          <div>
            <Label htmlFor="min_rating">Minimum Rating Scale</Label>
            <Input
              id="min_rating"
              type="number"
              min="1"
              max="10"
              value={settings.min_rating}
              onChange={(e) => handleChange('min_rating', e.target.value)}
              placeholder="Enter minimum rating"
            />
          </div>

          <div>
            <Label htmlFor="max_rating">Maximum Rating Scale</Label>
            <Input
              id="max_rating"
              type="number"
              min="1"
              max="10"
              value={settings.max_rating}
              onChange={(e) => handleChange('max_rating', e.target.value)}
              placeholder="Enter maximum rating"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default Settings;
