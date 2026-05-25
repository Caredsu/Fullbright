import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import DataTable from '../components/DataTable';
import ToastContainer from '../components/ToastContainer';
import useToast from '../hooks/useToast';

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { toasts, removeToast, success, error } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll(1, 1000);
      const userData = response.data?.data?.data || response.data?.data || [];
      setUsers(Array.isArray(userData) ? userData : []);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(userId);
        success('User deleted successfully');
        fetchUsers();
      } catch (err) {
        error(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleSubmit = async (formData, setErrors) => {
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, formData);
        success('User updated successfully');
      } else {
        await usersAPI.create(formData);
        success('User created successfully');
      }
      setShowModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      if (Object.keys(errors).length > 0) {
        setErrors(errors);
      } else {
        error(err.response?.data?.message || 'Failed to save user');
      }
    }
  };

  const [formData, setFormData] = useState({
    username: '',
    user_email: '',
    user_password: '',
    role: 'admin',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (editingUser) {
      setFormData({
        username: editingUser.username || '',
        user_email: editingUser.user_email || '',
        user_password: '',
        role: editingUser.role || 'admin',
        status: editingUser.status || 'active',
      });
    } else {
      setFormData({ username: '', user_email: '', user_password: '', role: 'admin', status: 'active' });
    }
  }, [editingUser, showModal]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Users Management</h2>
        <div>
          <Button
            onClick={() => {
              setEditingUser(null);
              setShowModal(true);
            }}
          >
            Add New User
          </Button>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />

      <Card>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'username',
                label: 'Username',
              },
              {
                key: 'user_email',
                label: 'Email',
              },
              {
                key: 'role',
                label: 'Role',
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
                    {row.status}
                  </Badge>
                ),
              },
            ]}
            data={users}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchableFields={['username', 'user_email', 'role']}
          />
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-4">
            <div>
              <Label>Username</Label>
              <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.user_email} onChange={(e) => setFormData({ ...formData, user_email: e.target.value })} />
            </div>
            <div>
              <Label>Password {editingUser ? '(leave blank to keep current)' : ''}</Label>
              <Input type="password" value={formData.user_password} onChange={(e) => setFormData({ ...formData, user_password: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <select className="w-full rounded-md border border-input px-3 py-2" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="w-full rounded-md border border-input px-3 py-2" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingUser(null); }}>Cancel</Button>
              <Button onClick={async () => {
                setFormErrors({});
                const setErrors = (errs) => setFormErrors(errs);
                await handleSubmit(formData, setErrors);
              }}>{editingUser ? 'Update' : 'Create'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Users;
