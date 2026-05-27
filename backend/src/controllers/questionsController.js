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
    const { page = 1, limit = 10, category } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const questionsCollection = getCollection('questions');

    let filter = {};
    if (category) {
      filter.category = category;
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
    const { text, category, type, options } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    const questionsCollection = getCollection('questions');

    const newQuestion = {
      text: text,
      category: category || 'general',
      type: type || 'rating', // rating, multiple_choice, text, etc.
      options: options || [],
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
    const { text, category, type, options } = req.body;

    const questionsCollection = getCollection('questions');

    const updateData = {};
    if (text) updateData.text = text;
    if (category) updateData.category = category;
    if (type) updateData.type = type;
    if (options) updateData.options = options;
    updateData.updated_at = new Date();
    updateData.updated_by = req.session?.username || 'system';

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
