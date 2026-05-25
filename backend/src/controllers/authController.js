import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const adminsCollection = getCollection('admins');
    const user = await adminsCollection.findOne({ username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Set session
    req.session.user_id = user._id.toString();
    req.session.username = user.username;
    req.session.admin_role = user.role || 'staff';
    req.session.email = user.email;

    // Save session explicitly before responding
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Login failed - could not save session'
        });
      }

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Logout failed'
        });
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    if (!req.session?.user_id) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({
      _id: new ObjectId(req.session.user_id)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'staff' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    const usersCollection = getCollection('users');

    // Check if user exists
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      role,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await usersCollection.insertOne(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertedId.toString(),
        username,
        email,
        role
      }
    });
  } catch (error) {
    next(error);
  }
};
