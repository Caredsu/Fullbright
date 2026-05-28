import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../services/api';
import EvaluationsClosedModal from '../components/EvaluationsClosedModal';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { BarChart3, TrendingUp, Users, CheckSquare, Award, Star } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({
    metrics: {
      totalTeachers: 0,
      totalEvaluations: 0,
      averageRating: 0,
      activeUsers: 0
    },
    ratingDistribution: {},
    recentEvaluations: []
  });
  const [topTeachers, setTopTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [evalEnabled, setEvalEnabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsAPI.getDashboard();
        console.log('🔍 Analytics API Full Response:', response);
        
        // Extract data from response - axios wraps response in .data
        // Response structure: { success, message, data: { metrics, ... } }
        let analyticsData = response?.data;
        
        if (analyticsData?.data) {
          // If response is wrapped (has data.data), unwrap it
          analyticsData = analyticsData.data;
        }
        
        console.log('📊 Extracted analytics data:', analyticsData);
        console.log('📊 Metrics:', analyticsData?.metrics);
        console.log('👥 Recent Evaluations:', analyticsData?.recentEvaluations);
        
        // Ensure we have the right structure
        if (analyticsData && analyticsData.metrics) {
          setStats({
            metrics: {
              totalTeachers: analyticsData.metrics.totalTeachers || 0,
              totalEvaluations: analyticsData.metrics.totalEvaluations || 0,
              averageRating: analyticsData.metrics.averageRating || 0,
              activeUsers: analyticsData.metrics.activeUsers || 0
            },
            ratingDistribution: analyticsData.ratingDistribution || {},
            recentEvaluations: analyticsData.recentEvaluations || []
          });
        } else {
          throw new Error('Invalid analytics data structure');
        }
      } catch (err) {
        // If API fails, use default stats
        console.error('❌ Analytics API error:', err);
        console.error('Error details:', err.message);
        setStats({
          metrics: {
            totalTeachers: 0,
            totalEvaluations: 0,
            averageRating: 0,
            activeUsers: 0
          },
          ratingDistribution: {},
          recentEvaluations: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Check if evaluations are enabled
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const response = await axios.get(
          import.meta.env.VITE_API_URL 
            ? `${import.meta.env.VITE_API_URL}/api/settings`
            : 'http://localhost:3001/api/settings'
        );
        if (response.data.data) {
          setEvalEnabled(response.data.data.eval_enabled !== false);
          console.log('📋 Evaluations:', response.data.data.eval_enabled ? 'ENABLED' : 'DISABLED');
        }
      } catch (err) {
        console.error('Error checking evaluation status:', err);
        setEvalEnabled(true);
      }
    };

    checkSettings();
    // Check every 5 seconds for setting changes
    const interval = setInterval(checkSettings, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate top teachers from evaluations data
  useEffect(() => {
    if (stats?.recentEvaluations && stats.recentEvaluations.length > 0) {
      // Group evaluations by teacher and calculate averages
      const teacherRatings = {};
      
      stats.recentEvaluations.forEach(evaluation => {
        const teacherId = evaluation.teacher_id?.toString?.() || evaluation.teacher_id;
        const teacherName = evaluation.teacher_name || 'Unknown';
        const rating = parseFloat(evaluation.rating) || 0;
        const department = evaluation.department || 'N/A';
        
        if (teacherId) {
          if (!teacherRatings[teacherId]) {
            teacherRatings[teacherId] = {
              id: teacherId,
              name: teacherName,
              department: department,
              ratings: [],
              evaluationCount: 0
            };
          }
          // Count this evaluation even if rating is 0
          teacherRatings[teacherId].ratings.push(rating);
          teacherRatings[teacherId].evaluationCount += 1;
        }
      });
      
      // Calculate averages and sort
      const topTeachersList = Object.values(teacherRatings)
        .filter(t => t.ratings.length > 0)
        .map(t => ({
          ...t,
          averageRating: (t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length).toFixed(1)
        }))
        .sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating))
        .slice(0, 5);
      
      console.log('🏆 Top Teachers Calculated:', topTeachersList);
      setTopTeachers(topTeachersList);
    }
  }, [stats?.recentEvaluations]);

  const analyticsMetrics = [
    {
      title: 'Total Teachers',
      value: stats?.metrics?.totalTeachers || '0',
      icon: Users,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      description: 'Registered teachers'
    },
    {
      title: 'Total Evaluations',
      value: stats?.metrics?.totalEvaluations || '0',
      icon: CheckSquare,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      description: 'Submitted evaluations'
    },
    {
      title: 'Average Rating',
      value: (stats?.metrics?.averageRating || 0).toFixed(1) + '/5',
      icon: TrendingUp,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      description: 'Average score'
    },
    {
      title: 'Active Users',
      value: stats?.metrics?.activeUsers || '0',
      icon: BarChart3,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      description: 'System users'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Simple bar chart component for rating distribution
  const RatingChart = ({ data }) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-medium text-muted-foreground mb-2">No evaluation data yet</p>
          <p className="text-xs text-gray-400 max-w-xs">Evaluations will appear here once teachers receive ratings. Get started by accessing the evaluation system.</p>
        </div>
      );
    }

    const maxCount = Math.max(...Object.values(data));
    
    return (
      <div className="flex items-end gap-4 h-48">
        {[1, 2, 3, 4, 5].map((rating) => {
          const key = `rating_${rating}`;
          const count = data[key] || 0;
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={rating} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg" style={{ height: `${Math.max(percentage, 5)}%`, minHeight: '20px' }}>
                {count > 0 && <span className="text-xs font-bold text-white mt-1">{count}</span>}
              </div>
              <span className="text-xs font-medium mt-2">{rating}/5</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Top Teachers Leaderboard Component
  const TopTeachersLeaderboard = ({ teachers }) => {
    const medalEmojis = ['🥇', '🥈', '🥉', '⭐', '✨'];
    
    if (!teachers || teachers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-base font-semibold text-gray-700 mb-2">No ratings yet</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Top performing teachers will appear here once they receive evaluations.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {teachers.map((teacher, idx) => (
          <div 
            key={teacher.id} 
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate('/results')}
          >
            {/* Rank Badge */}
            <div className="text-2xl font-bold min-w-fit">{medalEmojis[idx] || '⭐'}</div>
            
            {/* Teacher Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{teacher.name}</p>
              <p className="text-sm text-gray-600">{teacher.department}</p>
            </div>
            
            {/* Rating Display */}
            <div className="flex items-center gap-2 ml-auto pl-4 border-l border-gray-300">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-lg text-gray-900">{teacher.averageRating}</span>
              <span className="text-sm text-gray-600">/5</span>
              <span className="text-xs text-gray-500 ml-1">({teacher.evaluationCount})</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Recent evaluations table
  const RecentEvaluationsTable = ({ evaluations, navigate }) => {
    if (!evaluations || evaluations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-base font-semibold text-gray-700 mb-2">No recent evaluations</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            The latest evaluations from your admins will appear here. Start the evaluation process to see activity.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 font-semibold">Teacher</th>
              <th className="text-left py-3 px-4 font-semibold">Evaluator</th>
              <th className="text-center py-3 px-4 font-semibold">Rating</th>
              <th className="text-center py-3 px-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => (
              <tr key={evaluation.id} className="border-b hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-medium">{evaluation.teacher_name}</td>
                <td className="py-3 px-4">{evaluation.evaluator}</td>
                <td className="py-3 px-4 text-center">
                  <span className="font-bold text-lg text-blue-600">{evaluation.rating}</span>
                  <span className="text-gray-500 text-xs ml-1">/5</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button
                    onClick={() => navigate('/results')}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Show modal if evaluations are disabled */}
      {!evalEnabled && <EvaluationsClosedModal />}

      <div>
        <h2 className="text-3xl font-bold">Welcome back!</h2>
        <p className="text-muted-foreground">Here's your system overview and analytics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {analyticsMetrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                    <p className="text-3xl font-bold mt-2">{metric.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                  </div>
                  <div className={`${metric.bgColor} p-3 rounded-lg`}>
                    <Icon className={`${metric.iconColor} w-6 h-6`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Teachers Leaderboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <CardTitle>Top Performing Teachers</CardTitle>
              <CardDescription>Teachers with highest average ratings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TopTeachersLeaderboard teachers={topTeachers} />
        </CardContent>
      </Card>

      {/* Analytics Charts - Removed Evaluation Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
            <CardDescription>Rating breakdown across all evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            <RatingChart data={stats?.ratingDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations</CardTitle>
          <CardDescription>Latest submission activity</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentEvaluationsTable evaluations={stats?.recentEvaluations} navigate={navigate} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
