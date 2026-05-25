import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { BarChart3, TrendingUp, Users, CheckSquare } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsAPI.getDashboard();
        // Response structure: { success, message, data: { metrics, ... } }
        setStats(response.data?.data || response.data);
      } catch (err) {
        // If API fails, use default stats
        console.log('Analytics API not available, using default stats');
        setStats({
          metrics: {
            totalTeachers: 0,
            totalEvaluations: 0,
            averageRating: 0,
            activeUsers: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
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
        {Object.entries(data).map(([rating, count]) => {
          const percentage = (count / maxCount) * 100;
          return (
            <div key={rating} className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg" style={{ height: `${percentage}%`, minHeight: '20px' }}>
                <span className="text-xs font-bold text-white mt-1">{count}</span>
              </div>
              <span className="text-xs font-medium mt-2">{rating.replace('rating_', '')}/5</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Status breakdown chart
  const StatusChart = ({ data }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) {
      return <p className="text-sm text-muted-foreground">No evaluation data</p>;
    }

    const colors = {
      completed: 'bg-green-500',
      in_progress: 'bg-yellow-500',
      pending: 'bg-red-500'
    };

    return (
      <div className="space-y-3">
        {Object.entries(data).map(([status, count]) => {
          const percentage = (count / total) * 100;
          return (
            <div key={status} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-sm font-bold">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${colors[status] || 'bg-blue-500'}`} style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Recent evaluations table
  const RecentEvaluationsTable = ({ evaluations }) => {
    if (!evaluations || evaluations.length === 0) {
      return <p className="text-sm text-muted-foreground">No recent evaluations</p>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2 px-2">Teacher</th>
              <th className="text-left py-2 px-2">Evaluator</th>
              <th className="text-center py-2 px-2">Rating</th>
              <th className="text-left py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => (
              <tr key={evaluation.id} className="border-b hover:bg-slate-50">
                <td className="py-3 px-2">{evaluation.teacher_name}</td>
                <td className="py-3 px-2">{evaluation.evaluator}</td>
                <td className="py-3 px-2 text-center">
                  <span className="font-bold text-lg">{evaluation.rating}</span>
                  <span className="text-gray-500">/5</span>
                </td>
                <td className="py-3 px-2">
                  <Badge 
                    variant="outline"
                    className={
                      evaluation.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                      evaluation.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }
                  >
                    {evaluation.status.replace('_', ' ')}
                  </Badge>
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

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Status</CardTitle>
            <CardDescription>Breakdown by completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusChart data={stats?.evaluationStatus} />
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
          <RecentEvaluationsTable evaluations={stats?.recentEvaluations} />
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
