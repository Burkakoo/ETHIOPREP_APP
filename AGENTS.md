# EthioPrep Development Guide

## Project Overview
EthioPrep is a full-stack Ethiopian entrance exam preparation platform with:
- Backend: Node.js/Express API with MongoDB Atlas
- Web: React.js admin/management dashboard
- Mobile: React Native (Expo) student application with offline support

## Development Commands

### Backend
```bash
cd Backend
npm install
npm run dev          # Development with hot reload
npm start            # Production
npm run check        # Syntax check all files
npm run seed         # Seed database
```

### Web
```bash
cd Web
npm install
npm run dev          # Development server (Vite)
npm run build        # Production build
npm run preview      # Preview production build
```

### Mobile
```bash
cd Mobile
npm install
npm start            # Start Expo
npm run android      # Run on Android
npm run ios          # Run on iOS (macOS only)
```

### Root Convenience Commands
```bash
npm run dev          # Backend
npm run web:dev      # Web frontend
npm run mobile:start # Mobile Expo
```

## Environment Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key-min-32-chars
BCRYPT_SALT_ROUNDS=12
CLIENT_ORIGIN=http://localhost:5173
CLIENT_ORIGINS=http://localhost:5173,https://your-production-domain.com
```

### Web (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
# For Android emulator: http://10.0.2.2:5000
# For physical device: http://192.168.x.x:5000
```

## Completed Improvements (All Phases)

### Phase 1: Security & Performance ✅
- ✅ Added rate limiting middleware for auth (5/15min), payment (10/hour), sync (30/min), and general API (100/15min)
- ✅ Implemented centralized error handling with custom error classes (AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError)
- ✅ Added database indexes for better query performance:
  - User: email, status, role+status, stream+status
  - Question: subjectId+isActive, chapterId+isActive, subjectId+difficulty+isActive, subjectId+questionType+isActive
  - All existing userId indexes maintained
- ✅ Created Mobile/.env.example for developer documentation

### Phase 2: Web Frontend Refactoring ✅
- ✅ Extracted reusable components:
  - `components/Badge.jsx` - Role and status badges
  - `components/Spinner.jsx` - Loading spinner
  - `components/Notice.jsx` - Notification messages
  - `components/Modal.jsx` - Modal component
  - `utils/helpers.js` - Utility functions (fmtDate, getGreeting)
- ✅ Created `pages/Overview.jsx` as example of page extraction
- ✅ Installed react-router-dom for future routing implementation
- ✅ Updated main.jsx to use extracted components

### Phase 3: Testing Infrastructure ✅
- ✅ Installed Vitest, @vitest/ui, and supertest for backend testing
- ✅ Testing framework ready for implementation

### Phase 4: API Documentation & Logging ✅
- ✅ Implemented structured logging with winston
  - Console logging in development
  - File logging (error.log, combined.log) in production
  - JSON format for production, colored console for development
- ✅ Integrated winston logger into error handler middleware
- ⏸️ Swagger/OpenAPI documentation skipped due to network issues (can be added later)

### Phase 5: Input Validation Consistency ✅
- ✅ Refactored auth.controller.js to use custom error classes
- ✅ Applied asyncHandler wrapper to all controller functions
- ✅ Removed try-catch blocks from controllers (handled by middleware)
- ✅ Validation logic now uses consistent error patterns

### Phase 6: Session Management ✅
- ✅ Implemented refresh token mechanism:
  - Created RefreshToken model with token rotation support
  - Access tokens expire in 15 minutes
  - Refresh tokens expire in 7 days
  - Token rotation on refresh (old token revoked, new token issued)
  - Device tracking for security
- ✅ Added new endpoints:
  - POST /api/auth/refresh-token - Refresh access token
  - POST /api/auth/logout - Revoke refresh token
- ✅ Updated register and login to return both access and refresh tokens
- ✅ Tokens stored in database for revocation capability

### Phase 7: Soft Deletion Consistency ✅
- ✅ Reviewed existing soft deletion patterns:
  - Notes use `status` field (active/archived/deleted)
  - Questions use `isActive` boolean
  - Subjects/Chapters use `isActive` boolean
- ✅ Documented current patterns in AGENTS.md
- ✅ Current implementation is consistent enough for production use
- ⏸️ Standardization to `deletedAt` deferred (requires major data migration)

### Phase 8: CORS Configuration ✅
- ✅ Updated CORS to support multiple origins
- ✅ Added CLIENT_ORIGINS environment variable (comma-separated)
- ✅ Fallback to CLIENT_ORIGIN if CLIENT_ORIGINS not set
- ✅ Updated .env.example with documentation
- ✅ Credentials enabled for cookie support

## Backend Architecture

### Middleware
- `auth.middleware.js` - JWT authentication and role-based access
- `rateLimit.middleware.js` - Rate limiting for API endpoints
- `errorHandler.middleware.js` - Centralized error handling with winston logging
- `validateObjectId.middleware.js` - MongoDB ObjectId validation

### Models
All models have proper indexes:
- User, Note, Payment, LearningProgress, SyncChange, RefreshToken
- ExamAttempt, Bookmark, Subscription
- Question, Exam, Subject, Chapter
- AnalyticsEvent, AnalyticsDaily

### Controllers
Controllers now use asyncHandler wrapper for consistent error handling:
```javascript
import { asyncHandler, ValidationError } from "../middleware/errorHandler.middleware.js";

export const myFunction = asyncHandler(async (request, response) => {
  // Your logic here
  throw new ValidationError("Error message");
});
```

### Logging
Structured logging with winston:
```javascript
import { logger } from "../config/logger.js";

logger.info("User action", { userId, action });
logger.error("Error occurred", { error, stack });
```

## API Endpoints

### Authentication
- POST /api/auth/register - Returns accessToken and refreshToken
- POST /api/auth/login - Returns accessToken and refreshToken
- POST /api/auth/refresh-token - Get new access token (NEW)
- POST /api/auth/logout - Revoke refresh token (NEW)
- GET /api/auth/me
- GET /api/auth/profile
- PATCH /api/auth/profile
- PATCH /api/auth/password
- PATCH /api/auth/stream

### Content Management
- GET/POST /api/question-bank/subjects
- PATCH /api/question-bank/subjects/:id/deactivate
- GET/POST /api/question-bank/chapters
- PATCH /api/question-bank/chapters/:id/deactivate
- GET/POST /api/question-bank/questions
- PATCH /api/question-bank/questions/:id/deactivate

### Exams
- GET/POST /api/exams
- PATCH /api/exams/:id/publish
- PATCH /api/exams/:id/archive

### Payments
- GET/POST /api/payments
- PATCH /api/payments/:id/verify
- GET /api/payments/dashboard

### Notes
- GET/POST /api/notes
- PUT/DELETE /api/notes/:id
- POST /api/notes/sync

### Users (Admin)
- GET /api/users
- PATCH /api/users/:id/role
- PATCH /api/users/:id/status

### Analytics
- GET /api/analytics/admin
- GET /api/analytics/summary

## Security Best Practices

1. **Rate Limiting**: Applied to auth (5/15min), payment (10/hour), sync (30/min), general API (100/15min)
2. **Authentication**: JWT with 15min access token, 7-day refresh token, bcrypt password hashing
3. **Token Rotation**: Refresh tokens are rotated on each refresh, old tokens revoked
4. **Session Management**: Refresh tokens stored in database for revocation
5. **Input Validation**: ObjectId validation, custom error classes
6. **CORS**: Supports multiple origins from environment, credentials enabled
7. **Helmet**: Security headers enabled
8. **Role-Based Access**: student, cash_manager, content_manager, admin
9. **Structured Logging**: Winston logger with file output in production

## Database Indexing Strategy

Composite indexes for common query patterns:
- `userId + status + updatedAt` (time-based user queries)
- `subjectId + isActive` (active content filtering)
- `userId + contentType + contentId` (unique progress tracking)
- `status + submittedAt` (payment dashboard queries)
- `userId + revoked` (refresh token queries)
- `expiresAt` with TTL (automatic token cleanup)

## Frontend Component Structure

### Reusable Components
- `components/Badge.jsx` - Role and status badges
- `components/Spinner.jsx` - Loading spinner
- `components/Notice.jsx` - Notification messages
- `components/Modal.jsx` - Modal component

### Utilities
- `utils/helpers.js` - fmtDate, getGreeting

### Pages (To Extract)
The following page components remain in main.jsx and should be extracted:
- `pages/SubjectsPage.jsx`
- `pages/QuestionsPage.jsx`
- `pages/ExamsPage.jsx`
- `pages/PaymentsPage.jsx`
- `pages/StaffNotesPage.jsx`
- `pages/UsersPage.jsx`
- `pages/AnalyticsPage.jsx`
- `pages/ChaptersPage.jsx`
- `components/Auth.jsx` - Authentication component
- `components/Dashboard.jsx` - Dashboard shell with sidebar

### Refactoring Pattern
1. Copy component function from main.jsx
2. Add imports at top (React, components, utils, services)
3. Export the component
4. Update main.jsx to import from new file
5. Test the page works correctly

## Remaining Tasks (Optional Enhancements)

### Web Frontend
- Extract remaining page components from main.jsx
- Implement React Router for proper routing
- Add loading states and error boundaries
- Implement refresh token rotation in frontend

### Backend
- Add Swagger/OpenAPI documentation (network issues prevented this)
- Write unit tests for controllers
- Write integration tests for API endpoints
- Add request logging middleware
- Implement API versioning

### Mobile
- Update mobile app to use refresh token flow
- Implement token rotation in mobile app
- Add offline queue retry logic improvements

### Database
- Consider standardizing soft deletion to `deletedAt` pattern (requires migration)
- Add database cleanup jobs for expired tokens
- Implement data archiving strategy
