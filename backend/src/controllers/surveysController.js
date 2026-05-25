import { getCollection } from '../config/database.js';

export const exportTAMSurvey = async (req, res, next) => {
  try {
    const { department } = req.query;

    const surveysCollection = getCollection('tam_surveys');

    let filter = {};
    if (department) {
      filter.department = department;
    }

    const surveys = await surveysCollection.find(filter).toArray();

    // Format CSV data
    let csvContent = 'ID,Department,Question,Response,Created At\n';
    
    surveys.forEach(survey => {
      const row = [
        survey._id?.toString() || '',
        survey.department || '',
        survey.question || '',
        survey.response || '',
        survey.created_at?.toISOString?.() || ''
      ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',');
      
      csvContent += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tam-survey-export.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const submitTAMSurvey = async (req, res, next) => {
  try {
    const { department, responses } = req.body;

    if (!department || !responses) {
      return res.status(400).json({
        success: false,
        message: 'Department and responses are required'
      });
    }

    const surveysCollection = getCollection('tam_surveys');

    const surveyEntries = responses.map(response => ({
      department: department,
      question: response.question || '',
      response: response.answer || '',
      created_by: req.session?.user_id || 'anonymous',
      created_at: new Date()
    }));

    const result = await surveysCollection.insertMany(surveyEntries);

    res.status(201).json({
      success: true,
      message: 'TAM survey submitted successfully',
      data: {
        insertedCount: result.insertedCount,
        ids: result.insertedIds
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getTAMSurveys = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, department } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;

    const surveysCollection = getCollection('tam_surveys');

    let filter = {};
    if (department) {
      filter.department = department;
    }

    const totalCount = await surveysCollection.countDocuments(filter);

    const surveys = await surveysCollection
      .find(filter)
      .skip(offset)
      .limit(limitNum)
      .toArray();

    res.json({
      success: true,
      data: {
        data: surveys,
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
