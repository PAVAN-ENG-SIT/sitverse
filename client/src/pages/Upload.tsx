import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload as UploadIcon, X, Video, ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { DragDropUpload } from "@/components/DragDropUpload";

const uploadFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Please select a category"),
  tags: z.array(z.string()).default([]),
});

type UploadFormData = z.infer<typeof uploadFormSchema>;

export default function Upload() {
  const [, setLocation] = useLocation();
  const { token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      tags: [],
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      if (!videoFile) throw new Error("Please select a video file");

      const formData = new FormData();
      formData.append("video", videoFile);
      if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("category", data.category);
      formData.append("tags", JSON.stringify(data.tags));

      const response = await fetch("/api/videos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video uploaded!",
        description: "Your video is now live.",
      });
      setLocation(`/watch/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVideoSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file (MP4, WebM, etc.)",
        variant: "destructive",
      });
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    if (!form.getValues("title")) {
      form.setValue("title", file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleThumbnailSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleVideoSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.getValues("tags").includes(tag)) {
      form.setValue("tags", [...form.getValues("tags"), tag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      form.getValues("tags").filter((t) => t !== tagToRemove)
    );
  };

  const onSubmit = (data: UploadFormData) => {
    uploadMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-16">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Sign in required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to upload videos
            </p>
            <Button onClick={() => setLocation("/login")} data-testid="button-login-redirect">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Video</h1>
          <p className="text-muted-foreground">Share your content with the world</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video File</CardTitle>
                <CardDescription>Upload your video in MP4 or WebM format</CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropUpload
                  onFileSelect={handleVideoSelect}
                  accept={{ "video/*": [] }}
                  icon={<Video className="w-8 h-8 text-muted-foreground" />}
                  label="Drag and drop your video"
                  preview={videoPreview}
                  onClear={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                  }}
                  progress={uploadProgress}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thumbnail</CardTitle>
                <CardDescription>Choose a custom thumbnail (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <DragDropUpload
                  onFileSelect={handleThumbnailSelect}
                  accept={{ "image/*": [] }}
                  icon={<ImageIcon className="w-8 h-8 text-muted-foreground" />}
                  label="Drag and drop thumbnail"
                  preview={thumbnailPreview}
                  onClear={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Details</CardTitle>
              <CardDescription>Add title, description, and tags</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter video title"
                            {...field}
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                            data-testid="input-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell viewers about your video"
                            {...field}
                            className="min-h-[100px] bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary resize-none"
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              className="bg-muted/50 border-0 focus:ring-1 focus:ring-primary"
                              data-testid="select-category"
                            >
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a tag"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            className="bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                            data-testid="input-tag"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={addTag}
                            data-testid="button-add-tag"
                          >
                            Add
                          </Button>
                        </div>
                        {field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {field.value.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  className="ml-1 hover:text-destructive"
                                  data-testid={`button-remove-tag-${tag}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {uploadMutation.isPending && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!videoFile || uploadMutation.isPending}
                    data-testid="button-submit-upload"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Upload Video
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
