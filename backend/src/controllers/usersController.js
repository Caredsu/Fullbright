import { getCollection } from '../config/database.js';

// Get all users (admins)
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const adminsCollection = getCollection('admins');
    
    const total = await adminsCollection.countDocuments();
    const users = await adminsCollection
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Map MongoDB fields to frontend fields
    const mappedUsers = users.map(user => ({
      _id: user._id,
      id: user._id,
      username: user.username,
      user_email: user.email || '',
      role: user.role || 'admin',
      status: user.status || 'active',
      lastLogin: user.lastLogin || null,
      createdBy: user.createdBy || 'system',
      lastUpdatedBy: user.lastUpdatedBy || 'system',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      data: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Create user
export const createUser = async (req, res) => {
  try {
    // Accept both user_email/user_password (from frontend) and email/password (legacy)
    const { username, user_email, user_password, email, password, role, status } = req.body;
    
    const emailValue = user_email || email;
    const passwordValue = user_password || password;

    if (!username || !passwordValue) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required'
      });
    }

    const adminsCollection = getCollection('admins');

    // Check if user already exists
    const existingUser = await adminsCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password (would need bcryptjs in production)
    const hashedPassword = passwordValue; // In production, use bcryptjs

    const newUser = {
      username,
      email: emailValue || '',
      password: hashedPassword,
      role: role || 'admin',
      status: status || 'active',
      createdBy: req.user?.username || 'system',
      lastUpdatedBy: req.user?.username || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await adminsCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: 'User created',
      data: {
        id: result.insertedId,
        ...newUser
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email, user_password, email, password, role, status } = req.body;

    const adminsCollection = getCollection('admins');
    const { ObjectId } = await import('mongodb');

    const updateData = {
      role: role,
      status: status,
      lastUpdatedBy: req.user?.username || 'system',
      updatedAt: new Date()
    };

    // Update email if provided (accept both user_email and email)
    if (user_email !== undefined) {
      updateData.email = user_email;
    } else if (email !== undefined) {
      updateData.email = email;
    }

    // Update password if provided (accept both user_password and password)
    if (user_password !== undefined && user_password !== '') {
      updateData.password = user_password;
    } else if (password !== undefined && password !== '') {
      updateData.password = password;
    }

    const result = await adminsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const adminsCollection = getCollection('admins');
    const { ObjectId } = await import('mongodb');

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const result = await adminsCollection.deleteOne(
      { _id: new ObjectId(id) }
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};
