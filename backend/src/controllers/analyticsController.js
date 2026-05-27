import { ObjectId } from 'mongodb';
import { getCollection } from '../config/database.js';

export const getDashboard = async (req, res, next) => {
  try {
    // Get collections
    const teachersCollection = getCollection('teachers');
    const evaluationsCollection = getCollection('evaluations');
    const usersCollection = getCollection('users');
    const questionsCollection = getCollection('questions');

    // Count total teachers
    const totalTeachers = await teachersCollection.countDocuments();

    // Count total evaluations
    const totalEvaluations = await evaluationsCollection.countDocuments();

    // Calculate average rating (only count non-null ratings)
    const ratingAggregation = await evaluationsCollection.aggregate([
      {
        $match: { rating: { $ne: null } }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]).toArray();

    const averageRating = ratingAggregation.length > 0 && ratingAggregation[0].averageRating
      ? parseFloat(ratingAggregation[0].averageRating.toFixed(1)) 
      : 0;

    // Count active users
    const activeUsers = await usersCollection.countDocuments({ 
      status: { $in: ['active', 'available'] } 
    });

    // Get department breakdown
    const departmentStats = await teachersCollection.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const departmentPerformance = departmentStats.map(dept => ({
      department: dept._id || 'Unassigned',
      teacherCount: dept.count,
      evaluatedCount: 0 // Will be updated with actual evaluation data
    }));

    // Get recent evaluations (last 5)
    const recentEvaluations = await evaluationsCollection.aggregate([
      {
        $lookup: {
          from: 'teachers',
          localField: 'teacher_id',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'evaluated_by',
          foreignField: '_id',
          as: 'evaluator'
        }
      },
      // If not found in admins, try users collection
      {
        $addFields: {
          evaluator: {
            $cond: [
              { $eq: [{ $size: '$evaluator' }, 0] },
              [{ username: 'Unknown' }],
              '$evaluator'
            ]
          }
        }
      },
      { $sort: { created_at: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          rating: 1,
          status: 1,
          created_at: 1,
          'teacher.first_name': 1,
          'teacher.last_name': 1,
          'evaluator.username': 1
        }
      }
    ]).toArray();

    const formattedRecentEvaluations = recentEvaluations.map(evaluation => ({
      id: evaluation._id.toString(),
      teacher_name: evaluation.teacher?.[0] 
        ? `${evaluation.teacher[0].first_name} ${evaluation.teacher[0].last_name}`.trim() 
        : 'Unknown',
      evaluator: evaluation.evaluator?.[0]?.username || 'Unknown',
      rating: evaluation.rating || 0,
      status: evaluation.status || 'pending',
      date: evaluation.created_at?.toISOString?.() || new Date().toISOString()
    }));

    // Get evaluation status breakdown - REMOVED (no longer needed)
    // const evaluationStatus = await evaluationsCollection.aggregate([ ... ]);
    // const statusBreakdown = { ... };

    // Get rating distribution (only non-null ratings)
    const ratingDistribution = await evaluationsCollection.aggregate([
      {
        $match: { rating: { $ne: null } }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    const ratingBreakdown = {};
    ratingDistribution.forEach(item => {
      if (item._id !== null && item._id !== undefined) {
        ratingBreakdown[`rating_${item._id}`] = item.count;
      }
    });

    res.json({
      success: true,
      message: 'Analytics data retrieved successfully',
      data: {
        metrics: {
          totalTeachers,
          totalEvaluations,
          averageRating,
          activeUsers,
          totalQuestions: await questionsCollection.countDocuments()
        },
        departmentPerformance,
        recentEvaluations: formattedRecentEvaluations,
        // evaluationStatus: REMOVED - no longer part of dashboard
        // ratingDistribution: REMOVED - no longer part of dashboard
        systemStatus: {
          database: 'connected',
          apiServer: 'running',
          backend: 'online'
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
};

// Get detailed analytics with filters
export const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;
    const evaluationsCollection = getCollection('evaluations');

    let filter = {};

    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) {
        filter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.created_at.$lte = new Date(endDate);
      }
    }

    if (department) {
      filter.department = department;
    }

    const analytics = await evaluationsCollection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEvaluations: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          minRating: { $min: '$rating' },
          maxRating: { $max: '$rating' }
        }
      }
    ]).toArray();

    res.json({
      success: true,
      message: 'Detailed analytics retrieved',
      data: analytics.length > 0 ? analytics[0] : {
        totalEvaluations: 0,
        averageRating: 0,
        minRating: 0,
        maxRating: 0
      }
    });
  } catch (error) {
    console.error('Detailed analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed analytics',
      error: error.message
    });
  }
};
