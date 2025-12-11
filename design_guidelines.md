# SITVerse Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from YouTube (video platform patterns), Apple (premium UI/UX), and Instagram Reels (modern social video) to create a professional, premium streaming platform.

## Core Design Principles
- **Premium & Elegant**: Apple-grade quality with refined details
- **Glass Morphism**: Subtle transparency effects with backdrop blur
- **Smooth Animations**: Framer Motion for delightful micro-interactions
- **Modern Minimalism**: Clean layouts with purposeful whitespace

## Typography
**Font Stack**: 
- Primary: 'Inter' (Google Fonts) for UI elements, body text
- Display: 'SF Pro Display' fallback to 'Inter' for headings

**Hierarchy**:
- Hero/Page Titles: text-4xl to text-6xl, font-bold
- Section Headers: text-2xl to text-3xl, font-semibold
- Video Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Metadata/Captions: text-sm, text-xs for timestamps

## Layout System
**Spacing Units**: Tailwind primitives - 2, 4, 6, 8, 12, 16, 20, 24, 32
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20
- Card gaps: gap-4, gap-6
- Container max-width: max-w-7xl with px-4/px-6 gutters

## Component Library

### Navigation
**Top Navigation Bar**: Fixed header with glassmorphism effect (backdrop-blur-lg), includes logo, search bar (center), auth buttons/profile avatar (right). Height: h-16. Sticky positioning with subtle shadow on scroll.

### Video Cards
**Grid Layout**: 
- Desktop: grid-cols-4
- Tablet: grid-cols-3  
- Mobile: grid-cols-1

**Card Structure**: 
- Thumbnail container with 16:9 aspect ratio
- Video duration badge (bottom-right overlay, text-xs, backdrop-blur)
- Thumbnail hover: scale-105 transform with smooth transition
- Below thumbnail: Title (2-line truncate), Channel name, Views + Upload time (text-sm muted)
- Card padding: p-0, gap-3 between elements

### Video Player Page
**Layout**: 
- Primary video player: Full width, max-w-6xl centered
- Two-column below: Left (video details, comments), Right (suggestions sidebar on desktop)
- Mobile: Stack vertically

**Video Details Section**:
- Title: text-2xl, font-bold
- Metadata row: Views, Upload date, Like button, Share button (flexbox, items-center)
- Channel info: Avatar (circular, h-10 w-10), Channel name, Subscribe button
- Description: Expandable with "Show more" (initially collapsed after 3 lines)

### Comments Section
**Thread Design**:
- Top-level comments: Full width with avatar (left), content (right)
- Nested replies: Indent with ml-12, vertical connecting line
- Comment actions: Like count, Reply button (text-sm)
- Input field: Glassmorphism textarea with rounded-lg borders

### Upload Page
**Drag & Drop Zone**: 
- Large centered area with dashed border (border-dashed, border-2)
- Icon (upload cloud), "Drag video here" text
- Active state: Highlighted border with subtle background
- File selected: Show video preview thumbnail + filename + file size
- Form fields below: Title, Description (textarea), Category (dropdown), Tags (multi-input chips)

### Authentication Pages
**Centered Card Layout**:
- Glassmorphism card (max-w-md, centered)
- Gradient background (subtle, low opacity)
- Form inputs: Rounded-lg, backdrop-blur, border focus states
- Primary button: Full width, rounded-lg, smooth hover lift
- Switch between Login/Signup: Text link below form

### Admin Dashboard
**Grid Layout**:
- Stat cards: 4-column grid on desktop showing Total Users, Videos, Views, Likes
- Card design: Glassmorphism with icon, number (text-3xl bold), label
- Charts section: Bar/line charts for upload trends (2-column grid)
- Tables: User list, Video list with alternating row backgrounds, hover states

### Profile Page
**Header Section**:
- Cover area with gradient background
- Profile avatar (large, circular, overlapping cover)
- Username, bio, stats row (Videos | Followers | Likes)

**Videos Grid**: Same card pattern as home feed, filtered to user's uploads

## Animations
**Framer Motion Patterns**:
- Page transitions: Fade + slide up (initial={{ opacity: 0, y: 20 }})
- Card hover: Scale + shadow increase
- Button interactions: Slight scale on tap (whileTap={{ scale: 0.95 }})
- Like button: Heart pop animation
- Loading states: Skeleton screens with shimmer effect

**Performance**: Limit simultaneous animations, use transform properties for performance

## Glass Morphism Implementation
- Background: bg-white/80 dark:bg-gray-900/80
- Backdrop filter: backdrop-blur-lg
- Borders: border border-white/20
- Shadows: shadow-xl with subtle spread

## Images
**Hero Section**: NOT APPLICABLE - This is a video platform; home page leads directly with video grid

**Thumbnails Required**:
- Video thumbnails: 16:9 ratio, user-uploaded, displayed in all video cards
- Channel avatars: Circular, various sizes (h-8, h-10, h-16)
- Placeholder for missing thumbnails: Gradient with video icon

**Image Treatment**:
- Rounded corners: rounded-lg for thumbnails
- Hover effects: Brightness increase on video cards
- Loading: Progressive blur-up technique

## Responsive Behavior
- Mobile-first approach
- Navigation: Hamburger menu on mobile, full bar on desktop
- Video grid: Single column → 2 → 3 → 4 columns
- Player page: Suggestions move below video on mobile
- Form inputs: Full width on mobile, constrained on desktop

## Interactive States
**Buttons**: 
- Primary: Solid fill, hover lift + brightness, active press
- Secondary: Outline, hover fill transition
- Ghost: Transparent, hover background fade-in

**Video Cards**: Hover shows additional metadata (duration change to play icon preview)

**Forms**: Focus rings with brand accent, smooth transitions on all state changes