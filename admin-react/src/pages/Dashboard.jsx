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
import { BarChart3, TrendingUp, Users, CheckSquare } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({
    metrics: {
      totalTeachers: 0,
      totalEvaluations: 0,
      averageRating: 0,
      activeUsers: 0
    },
    ratingDistribution: {},
    evaluationStatus: { completed: 0, in_progress: 0, pending: 0 },
    recentEvaluations: []
  });
  const [loading, setLoading] = useState(true);
  const [evalEnabled, setEvalEnabled] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsAPI.getDashboard();
        // Response structure: { success, message, data: { metrics, ... } }
        console.log('🔍 Analytics API Full Response:', response);
        
        // Extract data from response
        const analyticsData = response.data?.data || response.data;
        console.log('📊 Extracted analytics data:', analyticsData);
        console.log('👥 Recent Evaluations:', analyticsData?.recentEvaluations);
        
        setStats(analyticsData);
      } catch (err) {
        // If API fails, use default stats
        console.error('❌ Analytics API error:', err);
        console.log('Using default stats');
        setStats({
          metrics: {
            totalTeachers: 0,
            totalEvaluations: 0,
            averageRating: 0,
            activeUsers: 0
          },
          ratingDistribution: {},
          evaluationStatus: { completed: 0, in_progress: 0, pending: 0 },
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
      return <p className="text-sm text-muted-foreground">No rating data available</p>;
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

  // Recent evaluations table
  const RecentEvaluationsTable = ({ evaluations, navigate }) => {
    if (!evaluations || evaluations.length === 0) {
      return <p className="text-sm text-muted-foreground">No recent evaluations</p>;
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

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Distribution</CardTitle>
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
