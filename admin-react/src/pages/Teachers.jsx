import React, { useState, useEffect } from 'react';
import { teachersAPI, departmentsAPI } from '../services/api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Badge } from '../components/ui/Badge';
import DataTable from '../components/DataTable';
import ToastContainer from '../components/ToastContainer';
import ImageUpload from '../components/ImageUpload';
import useToast from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const { toasts, removeToast, success, error } = useToast();
  const { canDelete } = useAuth();
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    department: '',
    email: '',
    status: 'active',
    profileImage: null,
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchTeachers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (editingTeacher) {
      setFormData({
        first_name: editingTeacher.first_name || '',
        middle_name: editingTeacher.middle_name || '',
        last_name: editingTeacher.last_name || '',
        department: editingTeacher.department || '',
        email: editingTeacher.email || '',
        status: editingTeacher.status || 'active',
        profileImage: editingTeacher.profileImage || null,
      });
    } else {
      setFormData({ first_name: '', middle_name: '', last_name: '', department: '', email: '', status: 'active', profileImage: null });
    }
  }, [editingTeacher, showModal]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      // Load all teachers for client-side pagination
      const response = await teachersAPI.getAll(1, 1000);
      console.log('Teachers API Response:', response);
      const teacherData = response.data?.data?.data || response.data?.data || [];
      console.log('Teacher Data:', teacherData);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      error(err.response?.data?.message || 'Failed to load teachers');
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      const depts = Array.isArray(response.data) ? response.data : [];
      setDepartments(depts.length > 0 ? depts : ['ECT', 'EDUC', 'CCJE', 'BHT']);
    } catch (err) {
      console.error('Failed to load departments:', err);
      setDepartments(['ECT', 'EDUC', 'CCJE', 'BHT']);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setShowModal(true);
  };

  const handleDelete = async (teacherId) => {
    if (!canDelete()) {
      error('You do not have permission to delete teachers');
      return;
    }
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await teachersAPI.delete(teacherId);
        success('Teacher deleted successfully');
        fetchTeachers();
      } catch (err) {
        if (err.response?.status === 403) {
          error('You do not have permission to delete teachers');
        } else {
          error(err.response?.data?.message || 'Failed to delete teacher');
        }
      }
    }
  };

  const handleSubmit = async () => {
    // Client-side validation
    const newErrors = {};
    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name?.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.department?.trim()) newErrors.department = 'Department is required';
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      error('Please fill in all required fields');
      return;
    }
    
    setFormErrors({});
    try {
      if (editingTeacher) {
        await teachersAPI.update(editingTeacher._id || editingTeacher.id, formData);
        success('Teacher updated successfully');
      } else {
        await teachersAPI.create(formData);
        success('Teacher created successfully');
      }
      setShowModal(false);
      setEditingTeacher(null);
      fetchTeachers();
    } catch (err) {
      const errors = err.response?.data?.errors || {};
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
      }
      if (err.response?.status === 403) {
        error('You do not have permission to perform this action');
      } else {
        error(err.response?.data?.message || 'Failed to save teacher');
      }
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Teachers Management</h2>
        <Button
          onClick={() => {
            setEditingTeacher(null);
            setShowModal(true);
          }}
        >
          + Add New Teacher
        </Button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            columns={[
              {
                key: 'profileImage',
                label: 'Photo',
                render: (row) => (
                  row.profileImage ? (
                    <img 
                      src={row.profileImage} 
                      alt={`${row.first_name} ${row.last_name}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold">
                      {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
                    </div>
                  )
                ),
              },
              {
                key: 'name',
                label: 'Name',
                render: (row) => `${row.first_name} ${row.middle_name || ''} ${row.last_name}`.trim(),
              },
              {
                key: 'department',
                label: 'Department',
              },
              {
                key: 'email',
                label: 'Email',
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
              {
                key: 'updated_by',
                label: 'Last Updated By',
                render: (row) => (
                  <div className="text-sm">
                    <div className="font-medium">{row.updated_by || 'system'}</div>
                    {row.updated_at && (
                      <div className="text-xs text-gray-500">
                        {new Date(row.updated_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}  
            data={teachers}
            loading={loading}
            onEdit={handleEdit}
            onDelete={canDelete() ? handleDelete : null}
            searchableFields={['first_name', 'middle_name', 'last_name', 'department']}
          />
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <ImageUpload 
              value={formData.profileImage}
              onChange={(url) => setFormData({ ...formData, profileImage: url })}
              onError={(err) => error(err)}
            />
            
            <div>
              <Label>First Name *</Label>
              <Input 
                value={formData.first_name} 
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                className={formErrors.first_name ? 'border-red-500' : ''}
              />
              {formErrors.first_name && <p className="text-red-500 text-sm mt-1">{formErrors.first_name}</p>}
            </div>
            <div>
              <Label>Middle Name</Label>
              <Input 
                value={formData.middle_name} 
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                placeholder="Enter middle name"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input 
                value={formData.last_name} 
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
                className={formErrors.last_name ? 'border-red-500' : ''}
              />
              {formErrors.last_name && <p className="text-red-500 text-sm mt-1">{formErrors.last_name}</p>}
            </div>
            <div>
              <Label>Department *</Label>
              <select 
                className={`w-full rounded-md border px-3 py-2 ${formErrors.department ? 'border-red-500' : 'border-input'}`}
                value={formData.department} 
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {formErrors.department && <p className="text-red-500 text-sm mt-1">{formErrors.department}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email"
                value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label>Status</Label>
              <select 
                className="w-full rounded-md border border-input px-3 py-2"
                value={formData.status} 
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowModal(false); setEditingTeacher(null); }}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingTeacher ? 'Update' : 'Create'}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Teachers;
