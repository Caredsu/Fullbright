import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';
import { notifyNewEvaluation } from '../config/socket.js';

const objectIdToString = (id) => {
  return id instanceof ObjectId ? id.toString() : id;
};

export const getEvaluations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, teacher_id, user_id } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const evaluationsCollection = getCollection('evaluations');

    let filter = {};
    if (teacher_id) filter.teacher_id = new ObjectId(teacher_id);
    if (user_id) filter.evaluated_by = new ObjectId(user_id);

    const totalCount = await evaluationsCollection.countDocuments(filter);

    const evaluations = await evaluationsCollection
      .find(filter)
      .skip(offset)
      .limit(limitNum)
      .toArray();

    res.json({
      success: true,
      data: {
        data: evaluations.map(e => ({
          _id: e._id,
          id: objectIdToString(e._id),
          ...e
        })),
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

export const checkNewEvaluations = async (req, res, next) => {
  try {
    const { lastId, includeDetails } = req.query;
    const evaluationsCollection = getCollection('evaluations');

    // If lastId is provided, find evaluations after that ID
    let filter = {};
    if (lastId) {
      try {
        // Validate the ObjectId format
        if (lastId.length === 24 && /^[0-9a-f]{24}$/i.test(lastId)) {
          // Find the timestamp of the last evaluation
          const lastEval = await evaluationsCollection.findOne({
            _id: new ObjectId(lastId)
          });
          
          if (lastEval && lastEval.created_at) {
            // Find evaluations created after the last one
            filter.created_at = { $gt: lastEval.created_at };
          }
        }
      } catch (err) {
        // If lastId is invalid, just ignore it and return all recent evaluations
        console.warn('Invalid lastId format:', lastId);
      }
    }

    // Get the latest evaluation
    const latestEvaluations = await evaluationsCollection
      .find(filter)
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    const latestEvaluation = latestEvaluations[0];
    const hasNew = latestEvaluations.length > 0;

    const response = {
      success: true,
      has_new: hasNew,
      latest_id: latestEvaluation ? objectIdToString(latestEvaluation._id) : null
    };

    if (includeDetails && latestEvaluation) {
      response.latest_evaluation = {
        id: objectIdToString(latestEvaluation._id),
        teacher_id: objectIdToString(latestEvaluation.teacher_id),
        teacher_name: latestEvaluation.teacher_name,
        rating: latestEvaluation.rating,
        created_at: latestEvaluation.created_at
      };
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
};

export const checkEvaluatedTeachers = async (req, res, next) => {
  try {
    const { device_id, student_number } = req.query;

    // Validate required parameters
    if (!student_number) {
      return res.status(400).json({
        success: false,
        message: 'student_number is required'
      });
    }

    const evaluationsCollection = getCollection('evaluations');

    // Query evaluations for this specific student
    const filter = { student_id: student_number };
    console.log(`[DEBUG] checkEvaluatedTeachers - Querying with filter:`, filter);
    
    const evaluations = await evaluationsCollection
      .find(filter)
      .project({ teacher_id: 1, teacher_name: 1, created_at: 1, student_id: 1 })
      .toArray();

    console.log(`[DEBUG] Found ${evaluations.length} evaluations. Details:`, evaluations.map(e => ({student_id: e.student_id, teacher_id: e.teacher_id})));

    // Extract unique teacher IDs
    const evaluatedTeachers = {};
    evaluations.forEach(evaluation => {
      const teacherId = evaluation.teacher_id.toString ? evaluation.teacher_id.toString() : evaluation.teacher_id;
      if (!evaluatedTeachers[teacherId]) {
        evaluatedTeachers[teacherId] = {
          id: teacherId,
          name: evaluation.teacher_name,
          evaluated_at: evaluation.created_at,
          source: 'database'
        };
      }
    });

    console.log(`[DEBUG] checkEvaluatedTeachers - student_number: ${student_number}, device_id: ${device_id}, found: ${Object.keys(evaluatedTeachers).length} evaluations`);

    res.json({
      success: true,
      data: evaluatedTeachers,
      count: Object.keys(evaluatedTeachers).length
    });
  } catch (error) {
    next(error);
  }
};

export const clearEvaluation = async (req, res, next) => {
  try {
    const { evaluation_id } = req.body;

    if (!evaluation_id) {
      return res.status(400).json({
        success: false,
        message: 'Evaluation ID is required'
      });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(evaluation_id)) {
      return res.status(400).json({ success: false, message: 'Invalid evaluation ID format' });
    }

    const evaluationsCollection = getCollection('evaluations');

    const result = await evaluationsCollection.deleteOne({
      _id: new ObjectId(evaluation_id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      message: 'Evaluation cleared successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const exportPDF = async (req, res, next) => {
  try {
    const { type, teacher_id } = req.query;

    // This is a placeholder for PDF export functionality
    // In a real implementation, you would use a library like pdfkit or puppeteer
    // to generate PDF files

    res.json({
      success: true,
      message: 'PDF export initiated',
      data: {
        type: type || 'results',
        teacher_id: teacher_id,
        status: 'pending'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createEvaluation = async (req, res, next) => {
  try {
    const { teacher_id, questions_responses, rating, feedback, answers, student_id, positive_feedback, negative_feedback } = req.body;

    // Check if evaluations are enabled
    const settingsCollection = getCollection('settings');
    const settings = await settingsCollection.findOne({ _id: 'system' });
    
    // Block if eval_enabled is explicitly false or 0
    if (settings && (settings.eval_enabled === false || settings.eval_enabled === 0)) {
      return res.status(403).json({
        success: false,
        message: 'Evaluations are currently disabled by the administrator'
      });
    }

    // Validate student_id - must not be anonymous or empty
    if (!student_id || student_id === 'anonymous' || student_id.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Invalid session: Student must be authenticated before submitting evaluations'
      });
    }

    const evaluationsCollection = getCollection('evaluations');

    // Support both old and new payload formats
    const newEvaluation = {
      teacher_id: new ObjectId(teacher_id),
      // Use evaluated_by from session if available (admin), otherwise use student_id
      evaluated_by: req.session?.user_id ? new ObjectId(req.session.user_id) : student_id,
      questions_responses: questions_responses || [],
      answers: answers || {},  // New format: object with question_id -> rating mapping
      student_id: student_id, // Always use valid student_id - never 'anonymous'
      rating: rating || null,
      feedback: feedback || positive_feedback || '',
      positive_feedback: positive_feedback || '',
      negative_feedback: negative_feedback || '',
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await evaluationsCollection.insertOne(newEvaluation);

    // Get teacher info for notification
    const teachersCollection = getCollection('teachers');
    const teacher = await teachersCollection.findOne({ _id: new ObjectId(teacher_id) });

    // Emit real-time notification to admin dashboard
    const io = req.app?.locals?.io;
    if (io && teacher) {
      notifyNewEvaluation(io, {
        teacherId: teacher_id,
        studentId: student_id,
        averageRating: rating,
        feedback: feedback || positive_feedback || '',
        teacherName: `${teacher.first_name} ${teacher.last_name}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Evaluation created successfully',
      data: {
        id: result.insertedId.toString(),
        ...newEvaluation
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getEvaluationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!id || id.length !== 24 || !/^[0-9a-f]{24}$/i.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid evaluation ID format'
      });
    }

    const evaluationsCollection = getCollection('evaluations');

    const evaluation = await evaluationsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: objectIdToString(evaluation._id),
        ...evaluation
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { questions_responses, rating, feedback } = req.body;

    const evaluationsCollection = getCollection('evaluations');

    const updateData = {};
    if (questions_responses) updateData.questions_responses = questions_responses;
    if (rating !== undefined) updateData.rating = rating;
    if (feedback) updateData.feedback = feedback;
    updateData.updated_at = new Date();

    const result = await evaluationsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      message: 'Evaluation updated successfully',
      data: {
        id: objectIdToString(result.value._id),
        ...result.value
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid evaluation ID format' });
    }

    const evaluationsCollection = getCollection('evaluations');

    const result = await evaluationsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found'
      });
    }

    res.json({
      success: true,
      message: 'Evaluation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
