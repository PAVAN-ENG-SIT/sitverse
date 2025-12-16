import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Video,
  Eye,
  ThumbsUp,
  TrendingUp,
  LayoutDashboard,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { DailyUploadsChart, TopVideosChart } from "@/components/AdminCharts";
import type { User, VideoWithUploader } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  recentUploads: number;
}

interface UploadTrend {
  date: string;
  count: number;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {trend && (
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { isAdmin, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("sitverse_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: videos, isLoading: videosLoading } = useQuery<VideoWithUploader[]>({
    queryKey: ["/api/admin/videos"],
    queryFn: async () => {
      const response = await fetch("/api/admin/videos", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: topVideos } = useQuery<VideoWithUploader[]>({
    queryKey: ["/api/admin/top-videos"],
    queryFn: async () => {
      const response = await fetch("/api/admin/top-videos", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch top videos");
      return response.json();
    },
    enabled: isAdmin,
  });

  const { data: analytics } = useQuery<{ dailyUploads: { date: string; count: number }[] }>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const response = await fetch("/api/admin/analytics", { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
    enabled: isAdmin,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in with an admin account
            </p>
            <Button onClick={() => setLocation("/login")} data-testid="button-login-redirect">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin dashboard
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-home-redirect">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your platform
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                icon={Users}
              />
              <StatCard
                title="Total Videos"
                value={stats?.totalVideos || 0}
                icon={Video}
              />
              <StatCard
                title="Total Views"
                value={stats?.totalViews || 0}
                icon={Eye}
              />
              <StatCard
                title="Total Likes"
                value={stats?.totalLikes || 0}
                icon={ThumbsUp}
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {analytics?.dailyUploads && (
            <DailyUploadsChart data={analytics.dailyUploads} />
          )}
          {topVideos && (
            <TopVideosChart
              data={topVideos.slice(0, 5).map(v => ({
                title: v.title,
                views: v.views || 0,
                likes: v.likesCount || 0
              }))}
            />
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Performing Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topVideos && topVideos.length > 0 ? (
                <div className="space-y-4">
                  {topVideos.slice(0, 5).map((video, index) => (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      className="flex items-center gap-4 p-2 rounded-lg hover-elevate"
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="w-20 h-12 rounded bg-muted overflow-hidden shrink-0">
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {video.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {video.uploader?.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {(video.views || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" />
                          {(video.likesCount || 0).toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No videos yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Videos this week
                  </span>
                  <span className="font-semibold">
                    {stats?.recentUploads || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Average views
                  </span>
                  <span className="font-semibold">
                    {stats && stats.totalVideos > 0
                      ? Math.round(stats.totalViews / stats.totalVideos)
                      : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Engagement rate
                  </span>
                  <span className="font-semibold">
                    {stats && stats.totalViews > 0
                      ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2" data-testid="tab-admin-users">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2" data-testid="tab-admin-videos">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Users</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover-elevate"
                        data-testid={`user-row-${user.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback>
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {user.username}
                            </p>
                            {user.role === "admin" && (
                              <Badge variant="default" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No users found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="videos">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Videos</CardTitle>
              </CardHeader>
              <CardContent>
                {videosLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-20 rounded" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-48 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : videos && videos.length > 0 ? (
                  <div className="space-y-2">
                    {videos.map((video) => (
                      <Link
                        key={video.id}
                        href={`/watch/${video.id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover-elevate"
                        data-testid={`video-row-${video.id}`}
                      >
                        <div className="w-20 h-12 rounded bg-muted overflow-hidden shrink-0">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{video.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            by {video.uploader?.username}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {(video.views || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {(video.likesCount || 0).toLocaleString()}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {video.category}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No videos found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
