import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';

const objectIdToString = (id) => {
  return id instanceof ObjectId ? id.toString() : id;
};

export const getTeachers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, show_all } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const teachersCollection = getCollection('teachers');

    // Determine filter based on user role and show_all parameter
    let filter = {};

    if (!show_all) {
      // If user is not admin, only show active/available teachers
      if (req.session?.admin_role !== 'admin') {
        filter = { status: { $in: ['active', 'available'] } };
      }
    }

    // Get total count
    const totalCount = await teachersCollection.countDocuments(filter);

    // Fetch paginated teachers
    const teachers = await teachersCollection
      .find(filter, {
        projection: {
          first_name: 1,
          last_name: 1,
          middle_name: 1,
          department: 1,
          email: 1,
          status: 1,
          picture: 1,
          created_at: 1,
          updated_at: 1,
          updated_by: 1
        }
      })
      .skip(offset)
      .limit(limitNum)
      .toArray();

    // Get list of evaluated teachers for current user
    const evaluatedIds = [];
    if (req.session?.user_id) {
      const evaluationsCollection = getCollection('evaluations');
      const evaluated = await evaluationsCollection
        .find({ evaluator_id: new ObjectId(req.session.user_id) })
        .project({ teacher_id: 1 })
        .toArray();
      evaluatedIds.push(...evaluated.map(e => objectIdToString(e.teacher_id)));
    }

    const formattedTeachers = teachers.map(teacher => ({
      _id: teacher._id,
      id: objectIdToString(teacher._id),
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      middle_name: teacher.middle_name || '',
      department: teacher.department || '',
      email: teacher.email || '',
      status: teacher.status || 'active',
      picture: teacher.picture || null,
      profileImage: teacher.picture || null,
      created_at: teacher.created_at?.toISOString?.() || '',
      updated_at: teacher.updated_at?.toISOString?.() || '',
      updated_by: teacher.updated_by || 'system',
      is_evaluated: evaluatedIds.includes(objectIdToString(teacher._id))
    }));

    res.json({
      success: true,
      message: 'Teachers retrieved successfully',
      data: {
        data: formattedTeachers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          pages: Math.ceil(totalCount / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teachersCollection = getCollection('teachers');

    const teacher = await teachersCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: objectIdToString(teacher._id),
        ...teacher
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createTeacher = async (req, res, next) => {
  try {
    const { first_name, last_name, middle_name, department, email, status, profileImage } = req.body;

    if (!first_name || !last_name || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: first_name, last_name, department'
      });
    }

    const teachersCollection = getCollection('teachers');

    // Check for duplicate teacher (same first_name, last_name, and department)
    const existingTeacher = await teachersCollection.findOne({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      department: department.trim()
    });

    if (existingTeacher) {
      return res.status(409).json({
        success: false,
        message: `Teacher "${first_name} ${last_name}" in ${department} department already exists`,
        code: 'DUPLICATE_TEACHER'
      });
    }

    const newTeacher = {
      first_name,
      last_name,
      middle_name: middle_name || '',
      department,
      email,
      status: status || 'active',
      picture: profileImage || null,
      created_at: new Date(),
      created_by: req.session?.username || 'system',
      updated_at: new Date(),
      updated_by: req.session?.username || 'system'
    };

    const result = await teachersCollection.insertOne(newTeacher);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: {
        id: result.insertedId.toString(),
        ...newTeacher
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, middle_name, department, email, status, profileImage } = req.body;

    const teachersCollection = getCollection('teachers');

    // Check if teacher exists first
    const existingTeacher = await teachersCollection.findOne({ _id: new ObjectId(id) });
    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check for duplicate teacher (same first_name, last_name, and department), excluding current teacher
    if (first_name && last_name && department) {
      const duplicateTeacher = await teachersCollection.findOne({
        _id: { $ne: new ObjectId(id) },
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        department: department.trim()
      });

      if (duplicateTeacher) {
        return res.status(409).json({
          success: false,
          message: `Teacher "${first_name} ${last_name}" in ${department} department already exists`,
          code: 'DUPLICATE_TEACHER'
        });
      }
    }

    const updateData = {};
    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (middle_name !== undefined) updateData.middle_name = middle_name;
    if (department) updateData.department = department;
    if (email) updateData.email = email;
    if (status) updateData.status = status;
    if (profileImage !== undefined) updateData.picture = profileImage;
    updateData.updated_at = new Date();
    updateData.updated_by = req.user?.username || req.session?.username || 'system';

    const result = await teachersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: {
        id: objectIdToString(result.value._id),
        ...result.value
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid teacher ID format' });
    }

    const teachersCollection = getCollection('teachers');

    const result = await teachersCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const uploadTeacherImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const filename = `${Date.now()}_${req.file.originalname}`;
    const filepath = `/uploads/${filename}`;

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        path: filepath,
        filename: filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
};
