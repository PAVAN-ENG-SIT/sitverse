import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, ThumbsUp, Eye, Calendar } from "lucide-react";
import type { User, VideoWithUploader } from "@shared/schema";

interface ProfileStats {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const { data: profileUser, isLoading: userLoading } = useQuery<User>({
    queryKey: ["/api/users", id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const { data: userVideos, isLoading: videosLoading } = useQuery<VideoWithUploader[]>({
    queryKey: ["/api/users", id, "videos"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}/videos`);
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const { data: stats } = useQuery<ProfileStats>({
    queryKey: ["/api/users", id, "stats"],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}/stats`);
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const isOwnProfile = currentUser?.id === id;

  if (userLoading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center mb-8">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">User not found</h1>
          <p className="text-muted-foreground">
            The profile you're looking for doesn't exist
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="bg-gradient-to-b from-primary/10 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-24 h-24 mb-4 ring-4 ring-background">
              <AvatarImage src={profileUser.avatarUrl || undefined} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {profileUser.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold mb-1" data-testid="text-profile-username">
              {profileUser.username}
            </h1>
            {profileUser.bio && (
              <p className="text-muted-foreground max-w-md mb-4">{profileUser.bio}</p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
              <Calendar className="w-4 h-4" />
              Joined {formatDate(profileUser.createdAt)}
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-total-videos">
                  {stats?.totalVideos || 0}
                </p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-total-views">
                  {stats?.totalViews?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold" data-testid="text-total-likes">
                  {stats?.totalLikes?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-muted-foreground">Likes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="videos">
          <TabsList className="mb-6">
            <TabsTrigger value="videos" className="gap-2" data-testid="tab-videos">
              <Video className="w-4 h-4" />
              Videos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            {videosLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <VideoCardSkeleton key={i} />
                ))}
              </div>
            ) : userVideos && userVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userVideos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No videos yet</h2>
                <p className="text-muted-foreground">
                  {isOwnProfile
                    ? "You haven't uploaded any videos yet"
                    : "This user hasn't uploaded any videos yet"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
