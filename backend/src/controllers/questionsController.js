import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';

const objectIdToString = (id) => {
  return id instanceof ObjectId ? id.toString() : id;
};

// Convert options array to rating_scale object for 1-5 rating system
const optionsToRatingScale = (options) => {
  if (!Array.isArray(options)) return {};
  
  const ratingScale = {};
  options.forEach((option, index) => {
    if (option) {
      ratingScale[index + 1] = option;
    }
  });
  return ratingScale;
};

export const getQuestions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, set_number } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const questionsCollection = getCollection('questions');

    let filter = {};
    if (category) {
      filter.category = category;
    }
    if (set_number) {
      filter.set_number = parseInt(set_number);
    }

    const totalCount = await questionsCollection.countDocuments(filter);

    const questions = await questionsCollection
      .find(filter)
      .skip(offset)
      .limit(limitNum)
      .toArray();

    res.json({
      success: true,
      data: {
        data: questions.map(q => {
          // Normalize field names from database to API response
          return {
            _id: q._id,
            id: objectIdToString(q._id),
            text: q.text || '',
            question_text: q.text || '',
            type: q.type || 'rating',
            question_type: q.type || 'rating',
            category: q.category || '',
            set_number: q.set_number || null,
            choice_descriptions: q.choice_descriptions || {},
            options: q.options || [],
            rating_scale: optionsToRatingScale(q.options), // Convert options to rating_scale object
            criteria: q.options || [],
            status: q.status || 'active',
            required: q.required || false,
            created_at: q.created_at?.toISOString?.() || '',
            updated_at: q.updated_at?.toISOString?.() || '',
            created_by: q.created_by || 'system',
            updated_by: q.updated_by || 'system'
          };
        }),
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

export const getQuestionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const questionsCollection = getCollection('questions');

    const question = await questionsCollection.findOne({
      _id: new ObjectId(id)
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Normalize field names
    const normalizedQuestion = {
      id: objectIdToString(question._id),
      text: question.text || '',
      question_text: question.text || '',
      type: question.type || 'rating',
      question_type: question.type || 'rating',
      category: question.category || '',
      set_number: question.set_number || null,
      choice_descriptions: question.choice_descriptions || {},
      options: question.options || [],
      rating_scale: optionsToRatingScale(question.options), // Convert options to rating_scale object
      criteria: question.options || [],
      status: question.status || 'active',
      required: question.required || false,
      created_at: question.created_at?.toISOString?.() || '',
      updated_at: question.updated_at?.toISOString?.() || '',
      created_by: question.created_by || 'system',
      updated_by: question.updated_by || 'system'
    };

    res.json({
      success: true,
      data: normalizedQuestion
    });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (req, res, next) => {
  try {
    const { text, category, type, options, set_number, choice_descriptions } = req.body;
    console.log('🎯 createQuestion FULL req.body:', JSON.stringify(req.body, null, 2));
    console.log('🎯 createQuestion extracted:', { 
      text: text?.substring(0, 30), 
      set_number, 
      set_number_type: typeof set_number,
      type, 
      optionsCount: options?.length,
      choice_descriptions_keys: Object.keys(choice_descriptions || {})
    });

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    // Validate set_number if provided (must be 1-5)
    if (set_number !== undefined && (set_number < 1 || set_number > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Set number must be between 1 and 5'
      });
    }

    // Validate max questions per set (1-4 max 10 questions, set 5 is flexible)
    if (set_number && set_number >= 1 && set_number <= 4) {
      const questionsCollection = getCollection('questions');
      const countInSet = await questionsCollection.countDocuments({ set_number });
      if (countInSet >= 10) {
        return res.status(400).json({
          success: false,
          message: `Set ${set_number} has reached the maximum of 10 questions`
        });
      }
    }

    const questionsCollection = getCollection('questions');

    const newQuestion = {
      text: text,
      category: category || 'general',
      type: type || 'rating', // rating, multiple_choice, text, feedback, etc.
      options: options || [],
      set_number: set_number !== undefined ? set_number : null,
      choice_descriptions: choice_descriptions || {}, // {1: "desc1", 2: "desc2", ...}
      created_at: new Date(),
      updated_at: new Date(),
      created_by: req.session?.username || 'system'
    };

    const result = await questionsCollection.insertOne(newQuestion);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: {
        id: result.insertedId.toString(),
        ...newQuestion
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, category, type, options, set_number, choice_descriptions } = req.body;

    const questionsCollection = getCollection('questions');

    // Validate set_number if provided (must be 1-5)
    if (set_number !== undefined && (set_number < 1 || set_number > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Set number must be between 1 and 5'
      });
    }

    const updateData = {};
    if (text) updateData.text = text;
    if (category) updateData.category = category;
    if (type) updateData.type = type;
    if (options) updateData.options = options;
    if (set_number !== undefined) updateData.set_number = set_number;
    if (choice_descriptions !== undefined) updateData.choice_descriptions = choice_descriptions;
    updateData.updated_at = new Date();
    updateData.updated_by = req.session?.username || 'system';
    
    // Debug logging to trace updated_by issue
    console.log('🔍 updateQuestion Debug:', {
      sessionUsername: req.session?.username,
      sessionUserId: req.session?.user_id,
      adminRole: req.session?.admin_role,
      finalUpdatedBy: updateData.updated_by,
      sessionKeys: req.session ? Object.keys(req.session) : 'no session'
    });

    const result = await questionsCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: {
        id: objectIdToString(result.value._id),
        ...result.value
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID format' });
    }

    const questionsCollection = getCollection('questions');

    const result = await questionsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
