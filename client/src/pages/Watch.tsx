import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ThumbsUp,
  Eye,
  Calendar,
  Share2,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  CornerDownRight,
} from "lucide-react";
import type { VideoWithUploader, CommentWithUser } from "@shared/schema";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

interface CommentItemProps {
  comment: CommentWithUser;
  videoId: string;
  depth?: number;
}

function CommentItem({ comment, videoId, depth = 0 }: CommentItemProps) {
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  const replyMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/videos/${videoId}/comments`, {
        text,
        parentId: comment.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", videoId, "comments"] });
      setReplyText("");
      setShowReplyInput(false);
      toast({ title: "Reply posted!" });
    },
  });

  const handleReply = () => {
    if (replyText.trim()) {
      replyMutation.mutate(replyText.trim());
    }
  };

  return (
    <div className={`${depth > 0 ? "ml-12 pt-4" : ""}`} data-testid={`comment-${comment.id}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={comment.user?.avatarUrl || undefined} />
          <AvatarFallback className="text-xs">
            {comment.user?.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user?.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
          <div className="flex items-center gap-4 mt-2">
            {isAuthenticated && depth < 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs"
                onClick={() => setShowReplyInput(!showReplyInput)}
                data-testid={`button-reply-${comment.id}`}
              >
                <CornerDownRight className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {showReplyInput && (
            <div className="mt-3 flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
                data-testid={`input-reply-${comment.id}`}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  data-testid={`button-submit-reply-${comment.id}`}
                >
                  {replyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReplyInput(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-0 text-xs text-primary mt-2"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide {comment.replies.length} replies
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    View {comment.replies.length} replies
                  </>
                )}
              </Button>
              {showReplies && (
                <div className="border-l-2 border-muted mt-2">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      videoId={videoId}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const { token, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [showFullDescription, setShowFullDescription] = useState(false);

  const { data: video, isLoading: videoLoading } = useQuery<VideoWithUploader>({
    queryKey: ["/api/videos", id],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${id}`);
      if (!response.ok) throw new Error("Failed to fetch video");
      return response.json();
    },
  });

  const { data: comments, isLoading: commentsLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/videos", id, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  const { data: relatedVideos } = useQuery<VideoWithUploader[]>({
    queryKey: ["/api/videos", "related", video?.category, id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (video?.category) params.set("category", video.category);
      if (id) params.set("exclude", id);
      const response = await fetch(`/api/videos?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch related videos");
      return response.json();
    },
    enabled: !!video?.category,
  });

  const { data: userLiked } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/videos", id, "liked"],
    queryFn: async () => {
      const authToken = localStorage.getItem("sitverse_token");
      if (!authToken) return { liked: false };
      const response = await fetch(`/api/videos/${id}/liked`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) return { liked: false };
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/videos/${id}/like`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos", id, "liked"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest("POST", `/api/videos/${id}/comments`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos", id, "comments"] });
      setCommentText("");
      toast({ title: "Comment posted!" });
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like videos",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      return;
    }
    commentMutation.mutate(commentText.trim());
  };

  if (videoLoading) {
    return (
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Video not found</h1>
          <p className="text-muted-foreground mb-4">
            The video you're looking for doesn't exist
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <video
                src={`/api/videos/stream/${video.id}`}
                controls
                autoPlay
                className="w-full h-full"
                data-testid="video-player"
              />
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2" data-testid="text-video-title">
                {video.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatViews(video.views || 0)} views
                </span>
                <span className="text-muted-foreground/50">-</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(video.uploadedAt)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                <Link
                  href={`/profile/${video.uploader?.id}`}
                  className="flex items-center gap-3"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={video.uploader?.avatarUrl || undefined} />
                    <AvatarFallback>
                      {video.uploader?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{video.uploader?.username}</p>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                  <Button
                    variant={userLiked?.liked ? "default" : "secondary"}
                    onClick={handleLike}
                    disabled={likeMutation.isPending}
                    data-testid="button-like"
                  >
                    <ThumbsUp
                      className={`w-4 h-4 mr-2 ${userLiked?.liked ? "fill-current" : ""}`}
                    />
                    {video.likesCount || 0}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied!" });
                    }}
                    data-testid="button-share"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {video.description && (
                <div className="py-4 border-b">
                  <p
                    className={`text-sm whitespace-pre-wrap ${
                      !showFullDescription ? "line-clamp-3" : ""
                    }`}
                    data-testid="text-video-description"
                  >
                    {video.description}
                  </p>
                  {video.description.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-auto p-0 text-primary"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      data-testid="button-show-more-description"
                    >
                      {showFullDescription ? "Show less" : "Show more"}
                    </Button>
                  )}
                </div>
              )}

              {video.tags && video.tags.length > 0 && (
                <div className="py-4 border-b">
                  <div className="flex flex-wrap gap-2">
                    {video.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="font-semibold">
                    {comments?.length || 0} Comments
                  </h2>
                </div>

                {isAuthenticated && (
                  <div className="flex gap-3 mb-6">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="min-h-[80px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                        data-testid="input-comment"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          onClick={handleComment}
                          disabled={!commentText.trim() || commentMutation.isPending}
                          data-testid="button-submit-comment"
                        >
                          {commentMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {commentsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    ))
                  ) : comments && comments.length > 0 ? (
                    comments
                      .filter((c) => !c.parentId)
                      .map((comment) => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          videoId={video.id}
                        />
                      ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Related Videos</h3>
            {relatedVideos && relatedVideos.length > 0 ? (
              relatedVideos.slice(0, 8).map((v) => (
                <VideoCard key={v.id} video={v} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No related videos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
