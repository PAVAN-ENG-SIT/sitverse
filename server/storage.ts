import {
  users,
  videos,
  comments,
  likes,
  type User,
  type InsertUser,
  type Video,
  type InsertVideo,
  type Comment,
  type InsertComment,
  type Like,
  type InsertLike,
  type VideoWithUploader,
  type CommentWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, ilike, or, and, not, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserStats(userId: string): Promise<{ totalVideos: number; totalViews: number; totalLikes: number }>;

  getVideo(id: string): Promise<VideoWithUploader | undefined>;
  getVideos(options?: {
    category?: string;
    sort?: string;
    search?: string;
    uploadedBy?: string;
    exclude?: string;
    limit?: number;
    offset?: number;
  }): Promise<VideoWithUploader[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  incrementViews(videoId: string): Promise<void>;
  getVideoCount(): Promise<number>;
  getTotalViews(): Promise<number>;
  getRecentUploadsCount(days: number): Promise<number>;
  getDailyUploadStats(days: number): Promise<{ date: string; count: number }[]>;
  getTopVideos(limit: number): Promise<VideoWithUploader[]>;

  getComments(videoId: string): Promise<CommentWithUser[]>;
  createComment(comment: InsertComment): Promise<Comment>;

  getLike(videoId: string, userId: string): Promise<Like | undefined>;
  createLike(like: InsertLike): Promise<Like>;
  deleteLike(videoId: string, userId: string): Promise<void>;
  getTotalLikes(): Promise<number>;
  updateVideoLikesCount(videoId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStats(userId: string): Promise<{ totalVideos: number; totalViews: number; totalLikes: number }> {
    const userVideos = await db.select().from(videos).where(eq(videos.uploadedBy, userId));
    const totalVideos = userVideos.length;
    const totalViews = userVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = userVideos.reduce((sum, v) => sum + (v.likesCount || 0), 0);
    return { totalVideos, totalViews, totalLikes };
  }

  async getVideo(id: string): Promise<VideoWithUploader | undefined> {
    const result = await db
      .select()
      .from(videos)
      .leftJoin(users, eq(videos.uploadedBy, users.id))
      .where(eq(videos.id, id));

    if (result.length === 0) return undefined;

    const { videos: video, users: uploader } = result[0];
    return {
      ...video,
      uploader: uploader!,
    };
  }

  async getVideos(options?: {
    category?: string;
    sort?: string;
    search?: string;
    uploadedBy?: string;
    exclude?: string;
    limit?: number;
    offset?: number;
  }): Promise<VideoWithUploader[]> {
    const conditions = [];

    if (options?.category && options.category !== "all") {
      conditions.push(eq(videos.category, options.category));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          ilike(videos.title, searchTerm),
          ilike(videos.description, searchTerm)
        )!
      );
    }

    if (options?.uploadedBy) {
      conditions.push(eq(videos.uploadedBy, options.uploadedBy));
    }

    if (options?.exclude) {
      conditions.push(not(eq(videos.id, options.exclude)));
    }

    let orderBy;
    switch (options?.sort) {
      case "popular":
        orderBy = desc(videos.likesCount);
        break;
      case "trending":
        orderBy = desc(videos.views);
        break;
      default:
        orderBy = desc(videos.uploadedAt);
    }

    const query = db
      .select()
      .from(videos)
      .leftJoin(users, eq(videos.uploadedBy, users.id))
      .orderBy(orderBy);

    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    const result = await query;

    return result.map(({ videos: video, users: uploader }) => ({
      ...video,
      uploader: uploader!,
    }));
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db.insert(videos).values(insertVideo).returning();
    return video;
  }

  async incrementViews(videoId: string): Promise<void> {
    await db
      .update(videos)
      .set({ views: sql`${videos.views} + 1` })
      .where(eq(videos.id, videoId));
  }

  async getVideoCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(videos);
    return Number(result[0]?.count || 0);
  }

  async getTotalViews(): Promise<number> {
    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${videos.views}), 0)` })
      .from(videos);
    return Number(result[0]?.total || 0);
  }

  async getRecentUploadsCount(days: number): Promise<number> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(videos)
      .where(gte(videos.uploadedAt, dateThreshold));

    return Number(result[0]?.count || 0);
  }

  async getDailyUploadStats(days: number): Promise<{ date: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT TO_CHAR(uploaded_at, 'YYYY-MM-DD') as date, COUNT(*)::int as count
      FROM videos
      WHERE uploaded_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
      GROUP BY date
      ORDER BY date ASC
    `);

    // Fill in missing days
    const stats: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = result.rows.find((r: any) => r.date === dateStr);
      stats.push({ date: dateStr, count: found ? (found as any).count : 0 });
    }
    return stats;
  }

  async getTopVideos(limit: number): Promise<VideoWithUploader[]> {
    const result = await db
      .select()
      .from(videos)
      .leftJoin(users, eq(videos.uploadedBy, users.id))
      .orderBy(desc(videos.views), desc(videos.likesCount))
      .limit(limit);

    return result.map(({ videos: video, users: uploader }) => ({
      ...video,
      uploader: uploader!,
    }));
  }

  async getComments(videoId: string): Promise<CommentWithUser[]> {
    const result = await db
      .select()
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.videoId, videoId))
      .orderBy(desc(comments.createdAt));

    const commentsWithUsers: CommentWithUser[] = result.map(
      ({ comments: comment, users: user }) => ({
        ...comment,
        user: user!,
        replies: [],
      })
    );

    const topLevel = commentsWithUsers.filter((c) => !c.parentId);
    const replies = commentsWithUsers.filter((c) => c.parentId);

    topLevel.forEach((comment) => {
      comment.replies = replies.filter((r) => r.parentId === comment.id);
    });

    return topLevel;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    return comment;
  }

  async getLike(videoId: string, userId: string): Promise<Like | undefined> {
    const [like] = await db
      .select()
      .from(likes)
      .where(and(eq(likes.videoId, videoId), eq(likes.userId, userId)));
    return like || undefined;
  }

  async createLike(insertLike: InsertLike): Promise<Like> {
    const [like] = await db.insert(likes).values(insertLike).returning();
    await this.updateVideoLikesCount(insertLike.videoId);
    return like;
  }

  async deleteLike(videoId: string, userId: string): Promise<void> {
    await db
      .delete(likes)
      .where(and(eq(likes.videoId, videoId), eq(likes.userId, userId)));
    await this.updateVideoLikesCount(videoId);
  }

  async getTotalLikes(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(likes);
    return Number(result[0]?.count || 0);
  }

  async updateVideoLikesCount(videoId: string): Promise<void> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.videoId, videoId));

    await db
      .update(videos)
      .set({ likesCount: Number(result?.count || 0) })
      .where(eq(videos.id, videoId));
  }
}

export const storage = new DatabaseStorage();
