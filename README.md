# SITVerse

A premium, production-ready, full-stack video uploading & streaming platform.

## Features

- **Video Streaming**: Byte-range support for fast seeking and smooth playback.
- **Uploads**: Drag & drop interface, auto-generated thumbnails, duration extraction using FFmpeg.
- **Social**: Likes, nested comments, profile pages.
- **Analytics**: Admin dashboard with interactive charts (Recharts) and daily upload stats.
- **Real-time**: Polling for interactions.
- **UI/UX**: Glassmorphism design, Framer Motion animations, Responsive layout.

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL (Drizzle ORM), Fluent-FFmpeg.
- **Frontend**: React, Vite, TailwindCSS, Radix UI, Framer Motion, Recharts.

## Local Development

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Database Setup**:
    - Ensure PostgreSQL is running.
    - Create a `.env` file with `DATABASE_URL=postgres://user:pass@localhost:5432/sitverse`.
    - Push schema:
      ```bash
      npm run db:push
      ```

3.  **FFmpeg**:
    - Ensure FFmpeg is installed and in your system PATH.

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Deployment on Render

This project is configured for deployment on Render.

1.  **Create a Web Service** on Render.
2.  **Connect your repository**.
3.  **Environment Variables**:
    - `DATABASE_URL`: Your internal/external PostgreSQL URL.
    - `SESSION_SECRET`: A secret string for sessions.
    - `NODE_ENV`: `production`
4.  **Build Command**:
    ```bash
    npm install && npm run build
    ```
5.  **Start Command**:
    ```bash
    npm run start
    ```

### PostgreSQL

- Create a hosted PostgreSQL database on Render or Supabase.
- Copy the connection string to `DATABASE_URL`.

### Disk Storage

- Note: Render Web Services have ephemeral file systems. Uploads will be lost on restart unless you attach a **Render Disk** mounted at `/opt/render/project/src/uploads` (or configure upload path relative to root). 
- For a persistent production app, consider updating `server/routes.ts` to upload to S3 or Cloudinary.

## Project Structure

- `server/`: Backend Express application.
- `client/`: Frontend React application.
- `shared/`: Shared types and schema.
- `uploads/`: Local storage for videos/thumbnails.
