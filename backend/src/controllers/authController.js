import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';

// Token generation helper
const generateTokens = (userId, username, role) => {
  const accessToken = jwt.sign(
    { 
      id: userId,
      username,
      role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minute access token
  );

  const refreshToken = jwt.sign(
    { 
      id: userId,
      username,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 day refresh token
  );

  return { accessToken, refreshToken };
};

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

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.username,
      user.role || 'staff'
    );

    // Set session (for backward compatibility with session-based auth)
    req.session.user_id = user._id.toString();
    req.session.username = user.username;
    req.session.admin_role = user.role || 'staff';
    req.session.email = user.email;

    // Set httpOnly cookie for refresh token (secure, cannot be accessed by JavaScript)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

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
        token: accessToken,
        refreshToken, // Also return in body for mobile/offline-first clients
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

// 🔄 Refresh access token using refresh token
export const refreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body (for mobile/offline-first clients)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    try {
      // Verify and decode refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { 
          id: decoded.id,
          username: decoded.username,
          type: 'access'
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.json({
        success: true,
        message: 'Token refreshed',
        token: newAccessToken
      });
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired - please login again'
        });
      }
      throw tokenError;
    }
  } catch (error) {
    next(error);
  }
};

// 🎓 Student direct access with JWT
export const studentLogin = async (req, res, next) => {
  try {
    const { student_number } = req.body;

    if (!student_number) {
      return res.status(400).json({
        success: false,
        message: 'Student number is required'
      });
    }

    // Generate JWT tokens for student
    const { accessToken, refreshToken } = generateTokens(
      student_number,
      `student_${student_number}`,
      'student'
    );

    // Set httpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Student access granted',
      token: accessToken,
      refreshToken,
      user: {
        student_number,
        role: 'student'
      }
    });
  } catch (error) {
    next(error);
  }
};
