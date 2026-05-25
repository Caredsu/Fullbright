import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { authAPI } from '../services/api';

function Settings() {
  const [settings, setSettings] = useState({
    eval_enabled: '1',
    min_rating: '1',
    max_rating: '5'
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChangePassword = async () => {
    // Validate
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      setErrorMsg('All password fields are required');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setErrorMsg('New passwords do not match');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    if (passwordForm.new_password.length < 6) {
      setErrorMsg('New password must be at least 6 characters');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setIsChangingPassword(true);
    try {
      await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password
      });
      setSuccessMsg('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to change password';
      setErrorMsg(errorMessage);
      setTimeout(() => setErrorMsg(''), 3000);
    } finally {
      setIsChangingPassword(false);
    }
  };


  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">System Settings</h2>
        <p className="text-muted-foreground">Manage system configuration and evaluation settings</p>
      </div>

      {successMsg && <div className="bg-green-50 text-green-800 p-3 rounded-lg mb-4">{successMsg}</div>}
      {errorMsg && <div className="bg-red-50 text-red-800 p-3 rounded-lg mb-4">{errorMsg}</div>}

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

      {/* Change Password */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => handlePasswordChange('current_password', e.target.value)}
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => handlePasswordChange('new_password', e.target.value)}
              placeholder="Enter new password (minimum 6 characters)"
            />
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default Settings;
