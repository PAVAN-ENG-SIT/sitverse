import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { signupSchema, loginSchema } from "@shared/schema";
import { ZodError } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "sitverse-secret-key";

const uploadsDir = path.join(process.cwd(), "uploads");
const videosDir = path.join(uploadsDir, "videos");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, videosDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbnailsDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "video") {
      if (file.mimetype.startsWith("video/")) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed"));
      }
    } else if (file.fieldname === "thumbnail") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    } else {
      cb(null, true);
    }
  },
});

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
      req.user = decoded;
    } catch {
      // Invalid token, continue without auth
    }
  }
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
      });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: "7d",
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/users/:id/videos", async (req, res) => {
    try {
      const videos = await storage.getVideos({ uploadedBy: req.params.id });
      res.json(videos);
    } catch (error) {
      console.error("Get user videos error:", error);
      res.status(500).json({ message: "Failed to get user videos" });
    }
  });

  app.get("/api/users/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Video routes
  app.get("/api/videos", async (req, res) => {
    try {
      const { category, sort, search, exclude } = req.query;
      const videos = await storage.getVideos({
        category: category as string,
        sort: sort as string,
        search: search as string,
        exclude: exclude as string,
      });
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Failed to get videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      await storage.incrementViews(req.params.id);
      res.json(video);
    } catch (error) {
      console.error("Get video error:", error);
      res.status(500).json({ message: "Failed to get video" });
    }
  });

  app.post(
    "/api/videos",
    authenticateToken,
    upload.fields([
      { name: "video", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    async (req: AuthRequest, res) => {
      try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        if (!files.video || files.video.length === 0) {
          return res.status(400).json({ message: "Video file is required" });
        }

        const videoFile = files.video[0];
        const thumbnailFile = files.thumbnail?.[0];

        let tags: string[] = [];
        try {
          tags = JSON.parse(req.body.tags || "[]");
        } catch {
          tags = [];
        }

        const video = await storage.createVideo({
          title: req.body.title,
          description: req.body.description || "",
          category: req.body.category,
          tags,
          videoUrl: `/uploads/videos/${videoFile.filename}`,
          thumbnailUrl: thumbnailFile
            ? `/uploads/thumbnails/${thumbnailFile.filename}`
            : null,
          uploadedBy: req.user!.id,
          duration: 0,
        });

        res.json(video);
      } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ message: "Failed to upload video" });
      }
    }
  );

  // Video streaming with byte-range support
  app.get("/api/videos/stream/:id", async (req, res) => {
    try {
      const video = await storage.getVideo(req.params.id);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      const videoPath = path.join(process.cwd(), video.videoUrl);

      if (!fs.existsSync(videoPath)) {
        return res.status(404).json({ message: "Video file not found" });
      }

      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
      }
    } catch (error) {
      console.error("Stream error:", error);
      res.status(500).json({ message: "Failed to stream video" });
    }
  });

  // Like routes
  app.get("/api/videos/:id/liked", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const like = await storage.getLike(req.params.id, req.user!.id);
      res.json({ liked: !!like });
    } catch (error) {
      console.error("Get liked error:", error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  app.post("/api/videos/:id/like", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const existingLike = await storage.getLike(req.params.id, req.user!.id);

      if (existingLike) {
        await storage.deleteLike(req.params.id, req.user!.id);
        res.json({ liked: false });
      } else {
        await storage.createLike({
          videoId: req.params.id,
          userId: req.user!.id,
        });
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Like error:", error);
      res.status(500).json({ message: "Failed to like video" });
    }
  });

  // Comment routes
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/videos/:id/comments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const comment = await storage.createComment({
        videoId: req.params.id,
        userId: req.user!.id,
        text: req.body.text,
        parentId: req.body.parentId || null,
      });
      res.json(comment);
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Admin routes
  app.get("/api/admin/stats", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const [totalUsers, totalVideos, totalViews, totalLikes, recentUploads] = await Promise.all([
        storage.getAllUsers().then((users) => users.length),
        storage.getVideoCount(),
        storage.getTotalViews(),
        storage.getTotalLikes(),
        storage.getRecentUploadsCount(7),
      ]);

      res.json({
        totalUsers,
        totalVideos,
        totalViews,
        totalLikes,
        recentUploads,
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/admin/videos", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const videos = await storage.getVideos({});
      res.json(videos);
    } catch (error) {
      console.error("Get admin videos error:", error);
      res.status(500).json({ message: "Failed to get videos" });
    }
  });

  app.get("/api/admin/top-videos", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const videos = await storage.getTopVideos(10);
      res.json(videos);
    } catch (error) {
      console.error("Get top videos error:", error);
      res.status(500).json({ message: "Failed to get top videos" });
    }
  });

  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  return httpServer;
}
