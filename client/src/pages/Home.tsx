import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { VideoCard, VideoCardSkeleton } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Clock, ThumbsUp, Search, Film } from "lucide-react";
import type { VideoWithUploader } from "@shared/schema";
import { CATEGORIES } from "@shared/schema";

type SortOption = "newest" | "popular" | "trending";

export default function Home() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const searchQuery = searchParams.get("search") || "";
  
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (sortBy) params.set("sort", sortBy);
    if (searchQuery) params.set("search", searchQuery);
    const queryStr = params.toString();
    return queryStr ? `/api/videos?${queryStr}` : "/api/videos";
  };

  const { data: videos, isLoading, error } = useQuery<VideoWithUploader[]>({
    queryKey: ["/api/videos", selectedCategory, sortBy, searchQuery],
    queryFn: async () => {
      const response = await fetch(buildQueryString());
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {searchQuery && (
          <div className="mb-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Search className="w-4 h-4" />
              <span className="text-sm">Search results for</span>
            </div>
            <h1 className="text-2xl font-bold" data-testid="text-search-query">
              "{searchQuery}"
            </h1>
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              data-testid="button-category-all"
            >
              All
            </Button>
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                data-testid={`button-category-${category.toLowerCase()}`}
              >
                {category}
              </Button>
            ))}
          </div>

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <TabsList>
              <TabsTrigger value="newest" className="gap-1.5" data-testid="tab-newest">
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Newest</span>
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-1.5" data-testid="tab-popular">
                <ThumbsUp className="w-4 h-4" />
                <span className="hidden sm:inline">Popular</span>
              </TabsTrigger>
              <TabsTrigger value="trending" className="gap-1.5" data-testid="tab-trending">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Trending</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to load videos</h2>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        ) : videos && videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Film className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No videos yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchQuery
                ? "No videos match your search. Try different keywords."
                : "Be the first to share amazing content with the world!"}
            </p>
            {!searchQuery && (
              <Button asChild data-testid="button-upload-first">
                <a href="/upload">Upload Your First Video</a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
