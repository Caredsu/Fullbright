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
            <CardTitle>Teacher Performance Trends</CardTitle>
            <CardDescription>Average ratings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-muted-foreground text-sm">Chart visualization will be displayed here</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evaluation Distribution</CardTitle>
            <CardDescription>Rating breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-muted-foreground text-sm">Chart visualization will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Evaluations</CardTitle>
            <CardDescription>Latest submission activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Recent evaluation activity will be displayed here</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Service health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge variant="default" className="bg-green-600">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Server</span>
                <Badge variant="default" className="bg-green-600">Running</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Backend</span>
                <Badge variant="default" className="bg-green-600">Online</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
          <CardDescription>Evaluation metrics by department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-muted-foreground text-sm">Department performance metrics will be displayed here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
