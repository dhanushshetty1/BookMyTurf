# BookMyTurf - End-to-End Project Notes

BookMyTurf is a full-stack sports turf booking application. It lets players discover available turfs, compare courts, select slots, pay online through Razorpay, and manage their bookings. It also gives turf owners a dashboard to register a facility, manage courts, generate time slots, block holidays, review bookings, and create offline bookings.

This document is written as both a project README and interview/resume preparation notes.

## 1. Project Summary

BookMyTurf solves the problem of manual turf discovery and slot reservation. Instead of calling a venue to check availability, a player can see courts, prices, available slots, and complete payment online. Owners can manage the operational side of the turf from one place.

Core features:

- Player registration and login.
- Owner registration and login.
- Role-based routing for players and turf owners.
- Turf listing with images, location, facilities, and sports.
- Court-level pricing with weekday/weekend rates.
- Full-court and half-court booking support.
- Slot generation for multiple dates and days of the week.
- Slot blocking and holiday mode for owners.
- Online payment order creation and verification using Razorpay.
- Offline booking entry for walk-in customers.
- Booking dashboard for players and owners.
- PostgreSQL database managed through Prisma ORM.
- Image uploads through Multer and static image serving from the backend.
- Docker Compose setup for local PostgreSQL.
- AWS deployment guide for production planning.

Suggested resume one-liner:

> Built BookMyTurf, a full-stack turf booking platform using React, TypeScript, Express, Prisma, PostgreSQL, JWT authentication, and Razorpay payments, supporting role-based player/owner workflows, slot management, half-court booking, and offline booking operations.

## 2. Tech Stack

Frontend:

- React 19
- TypeScript
- Vite
- React Router
- Redux Toolkit
- Axios
- Framer Motion
- Lucide React icons
- CSS Modules and global CSS

Backend:

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcryptjs password hashing
- Zod request validation
- Multer image uploads
- Razorpay order and payment verification

Infrastructure and tooling:

- Docker Compose for local PostgreSQL
- AWS deployment guide covering EC2, RDS, S3, CloudFront, Route 53, ACM, ALB, IAM, and security groups

## 3. High-Level Architecture

```text
Browser
  |
  | React + Vite frontend
  | Axios API calls
  v
Express API server
  |
  | Prisma Client
  v
PostgreSQL database

Express also serves uploaded turf images from /uploads.
Razorpay is used for online payment order creation and verification.
```

Runtime request flow:

1. User interacts with React pages.
2. Frontend service layer sends requests through a shared Axios client.
3. Axios attaches the JWT token from localStorage when available.
4. Express routes receive requests under `/api`.
5. Middleware handles authentication, authorization, validation, uploads, and errors.
6. Controllers call service functions.
7. Services contain business rules.
8. Repositories perform Prisma database operations.
9. Responses return to the frontend and update UI state.

## 4. Root File Structure

```text
BookMyTurf/
  README.md
  AWS_DEPLOYMENT_GUIDE.md
  docker-compose.yml
  package.json
  package-lock.json
  .env
  .gitignore
  booking-flow-court-cards.png

  client/
    package.json
    vite.config.ts
    tsconfig.json
    index.html
    public/
    src/
      App.tsx
      main.tsx
      config/
      context/
      store/
      services/
      features/
      pages/
      components/
      styles/
      utils/

  server/
    package.json
    src/
      app.js
      server.js
      core/
      modules/
    prisma/
      schema.prisma
      migrations/
    uploads/
```

Important root files:

- `docker-compose.yml`: starts local PostgreSQL on host port `5433`.
- `AWS_DEPLOYMENT_GUIDE.md`: detailed production deployment plan.
- `client/`: complete React frontend.
- `server/`: complete Express backend.
- `server/prisma/schema.prisma`: database schema and relationships.
- `server/uploads/`: uploaded turf/court images stored locally during development.

## 5. Frontend Structure

```text
client/src/
  main.tsx
  App.tsx

  config/
    index.ts

  store/
    index.ts

  features/
    auth/authSlice.ts
    turf/turfSlice.ts

  services/
    api.ts
    authService.ts
    turfService.ts
    bookingService.ts
    paymentService.ts

  pages/
    Home/
    Turfs/
    TurfDetails/
    Login/
    Register/
    Dashboard/
    BookingSuccess/
    About/
    owner/
      OwnerTurfs/
      OwnerBookings/
      components/
        TurfModal/
        CourtModal/
        ManageSlotsModal/
        OfflineBookingModal/

  components/
    layout/Navbar/
    common/
    booking/
    hero/
    onboarding/

  styles/
    global.css
    variables.css
    typography.css
    onboarding.css

  utils/
    formatDate.ts
    formatTime.ts
```

### 5.1 Frontend Entry Point

`client/src/main.tsx` mounts the React application.

It wraps the app with:

- `React.StrictMode`
- Redux `Provider`
- Global CSS import

The Redux store is configured in `client/src/store/index.ts`.

### 5.2 App Routing

`client/src/App.tsx` controls the main application flow.

It has three initial phases:

- `splash`: shows a loading screen.
- `onboarding`: shown once unless localStorage contains `bookmyturf:onboarding-complete`.
- `app`: renders the main router.

Routes:

```text
/                  Home page
/login             Login page
/register          Register page
/turfs             Turf/court marketplace
/turfs/:id         Turf details and booking page
/about             About page
/booking-success   Booking confirmation page
/dashboard         Player dashboard
/owner             Owner dashboard
```

Owner users are redirected to `/owner` after login/register. Player users go to the normal booking experience.

### 5.3 Config Layer

`client/src/config/index.ts` centralizes frontend environment values.

Important config values:

- `VITE_API_URL`: backend API URL. Defaults to `http://localhost:5000/api`.
- `VITE_IMAGE_BASE_URL`: image server base URL. If omitted, it is derived from the API URL.
- `VITE_RAZORPAY_KEY_ID`: Razorpay public key for checkout.

### 5.4 API Service Layer

`client/src/services/api.ts` creates a shared Axios instance.

Responsibilities:

- Uses `CONFIG.API_BASE_URL`.
- Sets JSON headers by default.
- Reads `token` from localStorage.
- Adds `Authorization: Bearer <token>` to authenticated requests.
- Provides a central place for future global error handling.

Feature services:

- `authService.ts`: register, login, profile, logout.
- `turfService.ts`: turf, court, and slot management.
- `bookingService.ts`: player bookings, owner bookings, offline booking, status updates.
- `paymentService.ts`: Razorpay order creation, payment verification, payment cancellation.

### 5.5 Redux State

`authSlice.ts`:

- Stores the logged-in user in Redux.
- Persists user details in localStorage.
- Tracks `isAuthenticated`.
- Provides `loginSuccess` and `logout`.

`turfSlice.ts`:

- Stores turf list state.
- Tracks loading state.
- Currently lightweight and mostly prepared for future expansion.

## 6. Frontend Page-by-Page Notes

### 6.1 Home Page

File: `client/src/pages/Home/Home.tsx`

Purpose:

- Landing screen for players.
- Shows hero section and featured turf cards.
- Fetches all turfs from the backend.
- Allows quick search by turf name or location.
- Redirects owners to the owner dashboard.

Important behavior:

- Calls `turfService.getAllTurfs()`.
- Uses local state for search and loading.
- Displays only the first six filtered turfs as featured turfs.
- Uses `IMAGE_BASE_URL` to display uploaded images.
- Shows a custom hero scene through `HeroTurfScene`.

### 6.2 Turfs Page

File: `client/src/pages/Turfs/Turfs.tsx`

Purpose:

- Marketplace view for all available courts.
- Converts turf data into court-level rows.
- Lets users filter by sport and search text.

Important behavior:

- Fetches all turfs.
- Builds `courtRows` by flattening each turf's courts.
- Filters by sport: All, Cricket, Football, Tennis, Pickleball.
- Displays court price, location, and available slots.
- The Book button navigates to `/turfs/:id?courtId=<courtId>`.

Why it matters:

- The page shows a user-friendly marketplace instead of forcing users to open every turf first.
- It separates turf identity from court inventory, which is important because one turf can have many courts.

### 6.3 Turf Details and Booking Page

File: `client/src/pages/TurfDetails/TurfDetails.tsx`

Purpose:

- Shows venue details.
- Lets the player choose court, date, slot, and booking type.
- Starts Razorpay checkout.
- Verifies payment after success.

Important behavior:

- Reads turf ID from URL params.
- Reads optional `courtId` from query params.
- Fetches turf details through `turfService.getTurfById(id)`.
- Filters active courts.
- If only one active court exists, it auto-selects it.
- If multiple active courts exist, user chooses a court first.
- Groups slots by date.
- Splits slots into morning, afternoon, and evening groups.
- Supports half-court booking when enabled by the owner.
- Allows booking a `PARTIALLY_BOOKED` slot only when half-court booking is selected.

Booking flow from this page:

1. User selects a court.
2. User selects date and slot.
3. User selects full court or half court when available.
4. User clicks Pay and Book Now.
5. If not logged in, user is redirected to login.
6. Razorpay checkout script is loaded.
7. Frontend calls `/api/payments/create-order`.
8. Backend creates a pending booking and Razorpay order.
9. Razorpay checkout opens.
10. On success, frontend calls `/api/payments/verify`.
11. Backend verifies signature and confirms booking.
12. Frontend shows booking success details.
13. Turf details are refreshed so slot availability updates.

### 6.4 Login Page

File: `client/src/pages/Login/Login.tsx`

Purpose:

- Authenticates existing users.
- Stores returned user data in Redux and localStorage.

Flow:

1. User enters email and password.
2. `authService.login()` posts to `/api/auth/login`.
3. Backend validates credentials and returns JWT token.
4. Frontend dispatches `loginSuccess`.
5. Owners go to `/owner`; players go to `/`.

### 6.5 Register Page

File: `client/src/pages/Register/Register.tsx`

Purpose:

- Creates new player or owner accounts.

Flow:

1. User enters name, email, phone, password.
2. User selects Player or Turf owner.
3. `authService.register()` posts to `/api/auth/register`.
4. Backend hashes password and creates the user.
5. Frontend logs the user in immediately.
6. Owner users are sent to `/owner`; players go to `/`.

### 6.6 Player Dashboard

File: `client/src/pages/Dashboard/Dashboard.tsx`

Purpose:

- Shows player bookings.
- Allows cancellation.
- Allows reschedule flow by cancelling and redirecting to choose a new slot.
- Opens booking details modal.

Important behavior:

- Redirects unauthenticated users to login.
- Redirects owners to `/owner`.
- Fetches bookings from `/api/bookings/mybookings`.
- Displays booking date, time, court type, full/half booking, and status.

### 6.7 Booking Success Page

File: `client/src/pages/BookingSuccess/BookingSuccess.tsx`

Purpose:

- Displays a confirmation ticket after successful booking.
- Shows booking code, venue, court, date, time, location, and amount.
- Allows sharing booking information.
- Links to dashboard.

Note:

- Current booking success details are also shown through `BookingDetailsModal` in the booking flow.

### 6.8 Owner Dashboard

File: `client/src/pages/owner/OwnerTurfs/OwnerTurfs.tsx`

Purpose:

- Main owner control panel.
- Lets an owner manage facility details, courts, slot schedules, booking records, and offline bookings.

Important behavior:

- Fetches owner turfs with `turfService.getMyTurfs()`.
- Current backend rule allows only one turf facility per owner.
- Shows courts as cards.
- Lets owner toggle court active/inactive status.
- Opens modals for turf editing, court editing, slot management, and offline booking.

Owner dashboard views:

- `TURFS`: manage facility and courts.
- `BOOKINGS`: finance and operations booking list.

### 6.9 Owner Bookings

File: `client/src/pages/owner/OwnerBookings/OwnerBookings.tsx`

Purpose:

- Operational booking management for owners.
- Shows online and offline bookings.
- Supports filtering by status, date, and customer name.

Important behavior:

- Fetches `/api/bookings/owner`.
- Masks customer phone numbers until owner reveals them.
- Shows booking code, booking type, customer, court, date, time, and amount.
- Allows owners to confirm pending bookings or cancel existing bookings.

### 6.10 Turf Modal

File: `client/src/pages/owner/components/TurfModal/TurfModal.tsx`

Purpose:

- Create or edit a turf facility.
- Add basic court entries while registering/editing the turf.
- Upload and manage turf images.
- Pick a cover image.
- Parse Google Maps links for address and coordinates when possible.

Important behavior:

- Uses `FormData` for multipart image uploads.
- Sends turf-level data first.
- Then syncs court records by creating, updating, or deleting courts.
- Supports facilities as selectable chips.
- Requires at least one court.

### 6.11 Court Modal

File: `client/src/pages/owner/components/CourtModal/CourtModal.tsx`

Purpose:

- Create or edit a court independently from the turf modal.

Important behavior:

- Supports court name, type, standard price, weekend price, images, and half-court prices.
- Uses `FormData` for images.
- Allows court type `CRICKET_FOOTBALL`, which the backend expands into linked cricket and football courts.

### 6.12 Manage Slots Modal

File: `client/src/pages/owner/components/ManageSlotsModal/ManageSlotsModal.tsx`

Purpose:

- Lets owners view existing slots.
- Generate slots in bulk.
- Block/unblock individual slots.
- Mark full days as holidays.

Important behavior:

- Fetches the selected court by calling `/turfs/my-turfs` and finding the court locally.
- Bulk slot generation uses start date, end date, selected weekdays, start time, end time, and duration.
- Preview shows generated time blocks before submission.
- Slot status toggling asks for confirmation.
- Booked and partially booked slots are protected from manual toggling in the UI.

### 6.13 Offline Booking Modal

File: `client/src/pages/owner/components/OfflineBookingModal/OfflineBookingModal.tsx`

Purpose:

- Lets owners create a booking for walk-in or phone customers.

Important behavior:

- Owner selects court, date, slot, booking type, guest name, guest phone, and amount collected.
- It filters available slots by selected date.
- Half-court offline booking is available only when the court supports half-court booking.
- Calls `/api/bookings/offline`.

## 7. Backend Structure

```text
server/src/
  server.js
  app.js

  core/
    config/
      db.js
    middlewares/
      auth.middleware.js
      error.middleware.js
      upload.middleware.js
      validation.middleware.js
    utils/
      helpers.js

  modules/
    auth/
      auth.routes.js
      auth.controller.js
      auth.service.js
      auth.validation.js
      user.repo.js

    turf/
      turf.routes.js
      turf.controller.js
      turf.service.js
      turf.validation.js
      turf.repo.js

    booking/
      booking.routes.js
      booking.controller.js
      booking.service.js
      booking.validation.js
      booking.repo.js

    payment/
      payment.routes.js
      payment.controller.js
      payment.service.js
      payment.validation.js
      payment.repo.js

    system/
      system.routes.js
```

Backend pattern:

```text
Route -> Middleware -> Controller -> Service -> Repository -> Prisma -> PostgreSQL
```

Why this structure is good:

- Routes stay focused on URL definitions.
- Controllers translate HTTP requests/responses.
- Services contain business rules.
- Repositories isolate database queries.
- Validation schemas are separate and reusable.
- Middleware handles cross-cutting concerns like auth, validation, uploads, and errors.

## 8. Backend Entry Points

### 8.1 `server/src/server.js`

Responsibilities:

- Loads environment variables.
- Reads `PORT`.
- Connects Prisma to the database.
- Starts Express server.
- Exits the process if database connection fails.

### 8.2 `server/src/app.js`

Responsibilities:

- Creates Express app.
- Configures CORS.
- Enables JSON body parsing.
- Mounts API routes.
- Serves uploaded images from `/uploads`.
- Exposes `/health`.
- Registers global error handler.

Mounted routes:

```text
/api/auth       Authentication
/api/turfs      Turf, court, slot management
/api/bookings   Booking management
/api/payments   Razorpay payment flow
/api/system     Utility/system routes
/uploads        Static uploaded images
/health         Health check
```

## 9. Core Backend Middleware

### 9.1 Database Client

File: `server/src/core/config/db.js`

Creates and exports a single `PrismaClient`.

### 9.2 Authentication Middleware

File: `server/src/core/middlewares/auth.middleware.js`

`protect`:

- Reads Bearer token from the `Authorization` header.
- Verifies JWT using `JWT_SECRET`.
- Loads the user from database.
- Adds `{ id, role }` to `req.user`.

`authorizeOwnerOrAdmin`:

- Allows only `OWNER` or `ADMIN`.
- Returns 403 for regular users.

### 9.3 Validation Middleware

File: `server/src/core/middlewares/validation.middleware.js`

Uses Zod schemas to validate:

- `req.body`
- `req.query`
- `req.params`

If validation passes, parsed values are written back to the request.

If validation fails, the API returns:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

### 9.4 Upload Middleware

File: `server/src/core/middlewares/upload.middleware.js`

Uses Multer disk storage.

Behavior:

- Saves files to `uploads/`.
- Generates names like `turf-<timestamp>.<extension>`.
- Accepts only image MIME types.
- Limits file size to 10 MB.

### 9.5 Error Middleware

File: `server/src/core/middlewares/error.middleware.js`

Handles:

- General errors.
- Prisma duplicate errors.
- Prisma validation errors.
- Multer file upload errors.

In production, stack traces are hidden.

## 10. Database Schema

File: `server/prisma/schema.prisma`

Database provider:

- PostgreSQL

Main models:

- `User`
- `Turf`
- `Court`
- `Slot`
- `Booking`
- `Payment`

### 10.1 User

Represents players, owners, and admins.

Important fields:

- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `phone`
- `bookings`
- `turfs`

Relationships:

- One user can create many bookings.
- One owner can own many turfs in the schema, but service logic currently allows only one turf per owner.

### 10.2 Turf

Represents a sports facility.

Important fields:

- `ownerId`
- `name`
- `location`
- `openingTime`
- `closingTime`
- `contactNumber`
- `address`
- `facilities`
- `googleMapsUrl`
- `latitude`
- `longitude`
- `images`
- `status`

Relationships:

- Belongs to one owner.
- Has many courts.
- Has many bookings.

### 10.3 Court

Represents a playable area inside a turf.

Important fields:

- `turfId`
- `sharedCourtGroupId`
- `name`
- `type`
- `pricePerHour`
- `weekendPricePerHour`
- `allowHalfCourtBooking`
- `halfCourtPricePerHour`
- `halfCourtWeekendPricePerHour`
- `images`
- `status`

Court types:

- `TENNIS`
- `CRICKET`
- `FOOTBALL`
- `PICKLEBALL`

Important concept:

- `sharedCourtGroupId` links courts that physically share the same ground, such as cricket and football versions of the same field.

### 10.4 Slot

Represents a time interval for one court.

Important fields:

- `courtId`
- `startTimeUTC`
- `endTimeUTC`
- `status`
- `price`
- `blockReason`

Slot statuses:

- `AVAILABLE`
- `PARTIALLY_BOOKED`
- `BOOKED`
- `BLOCKED`

Constraints:

- Unique combination of `courtId` and `startTimeUTC`.
- Indexed by court and start time.

### 10.5 Booking

Represents a player or offline reservation.

Important fields:

- `bookingCode`
- `userId`
- `turfId`
- `courtId`
- `slotId`
- `paymentStatus`
- `bookingStatus`
- `totalAmount`
- `bookingType`
- `courtUnits`
- `paymentTxId`
- `isOffline`
- `guestName`
- `guestPhone`

Booking types:

- `FULL`: consumes 2 court units.
- `HALF`: consumes 1 court unit.

Booking statuses:

- `PENDING`
- `CONFIRMED`
- `CANCELLED`

Payment statuses:

- `PENDING`
- `SUCCESS`
- `FAILED`

### 10.6 Payment

Represents a Razorpay order/payment record.

Important fields:

- `bookingId`
- `razorpayOrderId`
- `razorpayPaymentId`
- `razorpaySignature`
- `amount`
- `currency`
- `platformFee`
- `ownerShare`
- `status`
- `failureReason`

Why this is useful:

- Keeps financial information separate from booking information.
- Supports platform commission calculations.
- Makes payment reconciliation easier.

## 11. Backend Modules

### 11.1 Auth Module

Files:

- `server/src/modules/auth/auth.routes.js`
- `server/src/modules/auth/auth.controller.js`
- `server/src/modules/auth/auth.service.js`
- `server/src/modules/auth/auth.validation.js`
- `server/src/modules/auth/user.repo.js`

Endpoints:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
```

Register flow:

1. Request is validated by Zod.
2. Service checks whether email already exists.
3. Password is salted and hashed with bcrypt.
4. User is created in PostgreSQL.
5. JWT token is generated.
6. Response returns user details and token.

Login flow:

1. User submits email and password.
2. Service finds user by email.
3. bcrypt compares password with stored hash.
4. JWT token is returned on success.

JWT payload:

```json
{
  "id": "user-id",
  "role": "USER or OWNER or ADMIN"
}
```

### 11.2 Turf Module

Files:

- `server/src/modules/turf/turf.routes.js`
- `server/src/modules/turf/turf.controller.js`
- `server/src/modules/turf/turf.service.js`
- `server/src/modules/turf/turf.validation.js`
- `server/src/modules/turf/turf.repo.js`

Endpoints:

```text
GET    /api/turfs
GET    /api/turfs/my-turfs
GET    /api/turfs/:id
POST   /api/turfs
PUT    /api/turfs/:id
POST   /api/turfs/:id/courts
PUT    /api/turfs/courts/:courtId
DELETE /api/turfs/courts/:courtId
POST   /api/turfs/courts/:id/slots
POST   /api/turfs/courts/:id/slots/bulk
PATCH  /api/turfs/slots/:slotId
POST   /api/turfs/courts/:id/holiday
POST   /api/turfs/courts/:id/slots/bulk-block
```

Key business rules:

- Only owners/admins can create or update turfs.
- An owner can currently create only one turf facility.
- Owners can update only their own turf.
- Owners can manage only courts and slots belonging to their own turf.
- A court can be expanded into linked cricket and football courts using a shared court group.
- Linked courts share slot availability changes.
- Slot generation converts local IST date/time into UTC before storing.

Important turf service logic:

- `addTurf`: checks owner limit.
- `updateOwnedTurf`: enforces ownership.
- `addCourt`: handles normal courts and `CRICKET_FOOTBALL` shared courts.
- `updateCourt`: syncs shared court pricing/images/status across linked courts.
- `deleteCourt`: deletes all linked courts if court is part of a shared group.
- `generateBulkSlots`: creates slots across date ranges, weekdays, and durations.
- `blockDate`: marks all slots on a date as blocked.
- `blockTimeRange`: blocks slots in a specific time range.

### 11.3 Booking Module

Files:

- `server/src/modules/booking/booking.routes.js`
- `server/src/modules/booking/booking.controller.js`
- `server/src/modules/booking/booking.service.js`
- `server/src/modules/booking/booking.validation.js`
- `server/src/modules/booking/booking.repo.js`

Endpoints:

```text
POST  /api/bookings
GET   /api/bookings/mybookings
GET   /api/bookings/owner
PATCH /api/bookings/:id/status
POST  /api/bookings/offline
```

Important note:

- `POST /api/bookings` now returns HTTP 410 because online bookings must go through the payment flow.
- The actual online booking starts from `/api/payments/create-order`.

Key business rules:

- Bookings use database transactions.
- Slot rows are locked with `FOR UPDATE` to prevent double booking.
- Past slots cannot be booked.
- Blocked slots cannot be booked.
- Full-court booking consumes 2 units.
- Half-court booking consumes 1 unit.
- A slot has capacity of 2 units.
- If 1 unit is used, slot becomes `PARTIALLY_BOOKED`.
- If 2 units are used, slot becomes `BOOKED`.
- Cancelling a booking recalculates slot status.
- Offline bookings are marked confirmed and successful immediately.

Concurrency protection:

The booking repository uses a transaction and row locking:

```sql
SELECT * FROM "Slot"
WHERE id = <slotId>
FOR UPDATE
```

This prevents two users from booking the same slot at the same time.

### 11.4 Payment Module

Files:

- `server/src/modules/payment/payment.routes.js`
- `server/src/modules/payment/payment.controller.js`
- `server/src/modules/payment/payment.service.js`
- `server/src/modules/payment/payment.validation.js`
- `server/src/modules/payment/payment.repo.js`

Endpoints:

```text
POST /api/payments/create-order
POST /api/payments/verify
POST /api/payments/cancel
```

Create order flow:

1. User selects turf, court, slot, and booking type.
2. Backend creates a pending booking in a transaction.
3. Backend calculates booking amount from court/slot pricing.
4. Backend calculates platform fee and owner share.
5. Backend creates Razorpay order.
6. Backend stores payment record with `PENDING` status.
7. Frontend receives Razorpay checkout details.

Verify payment flow:

1. Frontend receives Razorpay payment response.
2. Frontend sends order ID, payment ID, signature, and booking ID.
3. Backend fetches matching payment record.
4. Backend verifies HMAC SHA-256 signature.
5. If valid, payment is marked `SUCCESS`.
6. Booking is marked `CONFIRMED`.
7. If invalid, booking is cancelled and payment is failed.

Cancel payment flow:

1. Used when user closes Razorpay popup or payment fails.
2. Backend verifies booking belongs to the user.
3. Pending booking is cancelled.
4. Payment is marked failed.
5. Slot capacity is released.

### 11.5 System Module

File:

- `server/src/modules/system/system.routes.js`

Endpoint:

```text
GET /api/system/time
```

Returns server time in UTC.

## 12. End-to-End User Flows

### 12.1 Player Online Booking Flow

```text
Register/Login
  -> Browse home or turfs page
  -> Open turf details
  -> Select court
  -> Select date
  -> Select available slot
  -> Choose full/half court if supported
  -> Create payment order
  -> Razorpay checkout
  -> Verify payment
  -> Booking confirmed
  -> Slot status updated
  -> Player can view booking in dashboard
```

Frontend files involved:

- `Login.tsx`
- `Register.tsx`
- `Home.tsx`
- `Turfs.tsx`
- `TurfDetails.tsx`
- `paymentService.ts`
- `Dashboard.tsx`

Backend files involved:

- Auth module
- Turf module
- Payment module
- Booking repository

### 12.2 Owner Facility Setup Flow

```text
Register as OWNER
  -> Redirect to owner dashboard
  -> Create turf facility
  -> Add facility images and details
  -> Add courts
  -> Add pricing
  -> Generate slots
  -> Facility becomes visible to players
```

Frontend files involved:

- `Register.tsx`
- `OwnerTurfs.tsx`
- `TurfModal.tsx`
- `CourtModal.tsx`
- `ManageSlotsModal.tsx`

Backend files involved:

- Auth module
- Turf module
- Upload middleware

### 12.3 Owner Slot Management Flow

```text
Owner dashboard
  -> Select court
  -> Open Manage Slots
  -> Generate slots for date range
  -> View existing slots by date
  -> Block/unblock manual slots
  -> Mark full day as holiday
```

Backend details:

- Slot times are stored in UTC.
- Owner-entered dates and times are treated as IST and converted before storing.
- Bulk generation uses `createMany` with `skipDuplicates`.

### 12.4 Half-Court Booking Flow

```text
Owner enables half-court booking on court
  -> Owner sets half-court price
  -> Player selects half court
  -> Booking consumes 1 court unit
  -> Slot becomes PARTIALLY_BOOKED
  -> Another half-court booking can consume remaining unit
  -> Slot becomes BOOKED
```

Important implementation detail:

- Full booking = 2 units.
- Half booking = 1 unit.
- Maximum slot capacity = 2 units.

This is handled in `server/src/modules/booking/booking.repo.js`.

### 12.5 Offline Booking Flow

```text
Owner opens Offline Booking
  -> Selects court
  -> Selects date
  -> Selects slot
  -> Enters guest name and phone
  -> Enters collected amount
  -> Backend creates confirmed booking
  -> Slot status is updated
```

Offline booking is useful for:

- Walk-in customers.
- Phone bookings.
- Owners who collect payment outside the app.

## 13. API Endpoint Summary

### Auth

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create user/owner account |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/profile` | Yes | Get current profile |

### Turfs, Courts, Slots

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/turfs` | No | List all turfs |
| GET | `/api/turfs/:id` | No | Get turf details with courts and future slots |
| GET | `/api/turfs/my-turfs` | Owner/Admin | Get owner facility |
| POST | `/api/turfs` | Owner/Admin | Create turf |
| PUT | `/api/turfs/:id` | Owner/Admin | Update turf |
| POST | `/api/turfs/:id/courts` | Owner/Admin | Add court |
| PUT | `/api/turfs/courts/:courtId` | Owner/Admin | Update court |
| DELETE | `/api/turfs/courts/:courtId` | Owner/Admin | Delete court |
| POST | `/api/turfs/courts/:id/slots` | Owner/Admin | Add one slot |
| POST | `/api/turfs/courts/:id/slots/bulk` | Owner/Admin | Generate slots |
| PATCH | `/api/turfs/slots/:slotId` | Owner/Admin | Update slot status |
| POST | `/api/turfs/courts/:id/holiday` | Owner/Admin | Block full date |
| POST | `/api/turfs/courts/:id/slots/bulk-block` | Owner/Admin | Block time range |

### Bookings

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/bookings` | User | Deprecated online booking route; returns 410 |
| GET | `/api/bookings/mybookings` | User | Player booking list |
| GET | `/api/bookings/owner` | Owner/Admin | Owner booking list |
| PATCH | `/api/bookings/:id/status` | Owner/Admin | Update booking status |
| POST | `/api/bookings/offline` | Owner/Admin | Create offline booking |

### Payments

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/payments/create-order` | User | Create pending booking and Razorpay order |
| POST | `/api/payments/verify` | User | Verify Razorpay signature and confirm booking |
| POST | `/api/payments/cancel` | User | Cancel pending payment and release slot |

### System

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/system/time` | No | Server time utility |
| GET | `/health` | No | API health check |

## 14. Local Setup

### 14.1 Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

This starts PostgreSQL with:

```text
Host port: 5433
Container port: 5432
Database: bookmyturf
User: postgres
Password: password123
```

### 14.2 Backend Environment

Create `server/.env`:

```env
DATABASE_URL="postgresql://postgres:password123@localhost:5433/bookmyturf?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
CLIENT_URL="http://localhost:5173"
PORT=5000

RAZORPAY_KEY_ID="your_razorpay_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
PLATFORM_COMMISSION_PERCENT=3
```

### 14.3 Client Environment

Create `client/.env`:

```env
VITE_API_URL="http://localhost:5000/api"
VITE_IMAGE_BASE_URL="http://localhost:5000"
VITE_RAZORPAY_KEY_ID="your_razorpay_key_id"
```

### 14.4 Install Dependencies

Backend:

```bash
cd server
npm install
```

Frontend:

```bash
cd client
npm install
```

### 14.5 Apply Database Schema

From `server/`:

```bash
npx prisma generate
npx prisma migrate dev
```

Alternative for quick sync:

```bash
npm run db:push
```

### 14.6 Run the App

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Default local URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/health
API:      http://localhost:5000/api
```

## 15. Environment Variables

Backend variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `JWT_SECRET` | Secret key for signing/verifying JWT tokens |
| `CLIENT_URL` | Allowed frontend origin for CORS |
| `PORT` | Backend port |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret |
| `PLATFORM_COMMISSION_PERCENT` | Platform commission percentage |

Frontend variables:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base API URL |
| `VITE_IMAGE_BASE_URL` | Base URL for uploaded images |
| `VITE_RAZORPAY_KEY_ID` | Razorpay checkout public key |

## 16. Security Notes

Implemented security-related features:

- Passwords are hashed using bcrypt.
- JWT authentication protects private routes.
- Owner/admin authorization protects facility management APIs.
- Zod validates request payloads.
- Multer accepts only images and enforces a 10 MB file limit.
- Prisma reduces SQL injection risk for normal ORM queries.
- Raw SQL for slot locking uses Prisma template parameters.
- Payment verification uses Razorpay HMAC signature validation.
- Backend hides stack traces in production.

Security improvements to mention honestly:

- Move uploaded images from local disk to S3 in production.
- Add refresh tokens or shorter JWT expiry for stronger session security.
- Add rate limiting for auth endpoints.
- Add input sanitization for text fields that are later rendered.
- Add stricter CORS configuration for production.
- Add centralized logging and audit logs for owner actions.
- Add webhook-based payment reconciliation from Razorpay.

## 17. Key Engineering Decisions

### 17.1 Route-Controller-Service-Repository Pattern

The backend separates responsibilities clearly:

- Routes define endpoint paths and middleware.
- Controllers handle HTTP-specific request/response work.
- Services implement business rules.
- Repositories isolate Prisma database operations.

This makes the code easier to test, debug, and extend.

### 17.2 Slot Booking Uses Transactions and Locks

The biggest correctness challenge is avoiding double booking.

The backend solves this by:

- Opening a database transaction.
- Locking the selected slot row with `FOR UPDATE`.
- Checking current slot status.
- Checking existing booking units.
- Updating slot status inside the same transaction.
- Creating booking inside the same transaction.

This prevents race conditions when multiple users attempt to book the same slot.

### 17.3 Half-Court Booking Uses Capacity Units

Instead of creating a separate table for half-courts, the system models capacity:

```text
FULL booking = 2 units
HALF booking = 1 unit
Maximum slot capacity = 2 units
```

Slot status is derived from consumed units:

```text
0 units -> AVAILABLE
1 unit  -> PARTIALLY_BOOKED
2 units -> BOOKED
```

This keeps the model simple while supporting both full and half bookings.

### 17.4 Shared Court Groups

Some grounds can be listed as both cricket and football. The backend supports this by creating linked courts with the same `sharedCourtGroupId`.

Benefits:

- Players can discover the ground under different sports.
- Owners do not need to manage completely separate physical availability.
- Slot blocking/status changes can be synchronized across linked courts.

### 17.5 Payment-First Online Booking

The old direct booking endpoint is disabled with HTTP 410. Online bookings now go through the payment module.

Reason:

- A booking should not be confirmed unless payment succeeds.
- Pending booking holds slot capacity during checkout.
- Failed or cancelled payment releases the slot.

## 18. Current Limitations

These are useful to discuss in interviews as future improvements:

- Local uploads are stored on disk; production should use S3 or another object store.
- No automated test suite is currently present.
- Auth state stores user in localStorage; a more secure setup could use httpOnly cookies.
- Razorpay webhooks are not implemented.
- Admin-specific UI is not implemented even though the role exists.
- Refund automation is not implemented.
- Owner can currently have only one turf by service rule.
- Some frontend types use `any`; stronger domain types would improve maintainability.
- No pagination is currently implemented for turfs or bookings.
- No email/SMS notifications are implemented for booking confirmation.

## 19. Future Enhancements

Practical next steps:

- Add automated tests for booking transactions and payment verification.
- Add Razorpay webhooks for payment reconciliation.
- Move image storage to S3 with signed uploads or backend upload forwarding.
- Add search by distance using latitude/longitude.
- Add maps UI for turf discovery.
- Add refund workflow for cancelled online bookings.
- Add owner analytics dashboard with revenue charts and slot utilization.
- Add admin dashboard for approving turfs and resolving disputes.
- Add notification system using email, SMS, or WhatsApp.
- Add pagination and server-side filtering for marketplace and booking pages.
- Add recurring slot templates.

## 20. Resume Bullet Points

Use these bullets depending on resume space:

- Built a full-stack turf booking platform with React, TypeScript, Express, Prisma, and PostgreSQL, supporting player and owner workflows.
- Implemented JWT authentication with role-based authorization for players, turf owners, and admins.
- Designed a normalized Prisma schema for users, turfs, courts, slots, bookings, and payments.
- Implemented race-condition-safe booking logic using PostgreSQL transactions and row-level locking.
- Integrated Razorpay payment flow with pending bookings, HMAC signature verification, cancellation handling, and platform fee calculation.
- Built an owner dashboard for turf registration, court management, bulk slot generation, holiday blocking, and offline booking entry.
- Added half-court booking support using a capacity-unit model that supports partially booked slots.
- Created reusable frontend API services with Axios interceptors for token-based requests.
- Built a responsive React UI with route-based player and owner experiences.
- Prepared AWS deployment documentation covering EC2, RDS, S3, CloudFront, Route 53, ACM, ALB, and IAM.

Short version:

> Developed BookMyTurf, a full-stack sports venue booking app with React, Express, Prisma, PostgreSQL, JWT auth, Razorpay payments, role-based dashboards, slot scheduling, offline bookings, and concurrency-safe booking transactions.

## 21. Interview Explanation Script

Use this as a spoken answer:

> BookMyTurf is a full-stack turf booking application. Players can browse turfs, filter courts by sport, select available slots, and pay online through Razorpay. Turf owners have a separate dashboard where they can create a facility, add courts, configure pricing, generate slots in bulk, block holidays, and create offline bookings for walk-in customers.
>
> The frontend is built with React, TypeScript, Vite, React Router, Redux Toolkit, and Axios. I separated API calls into service files like authService, turfService, bookingService, and paymentService. The backend uses Express with a route-controller-service-repository structure. Prisma ORM connects to PostgreSQL.
>
> The most important backend part is booking correctness. When a user books a slot, the backend creates a transaction and locks the slot row using `FOR UPDATE`. It checks whether the slot is available, whether it is already booked, and whether half-court capacity is still available. Then it updates the slot status and creates the booking within the same transaction, which prevents double booking.
>
> Payments are handled through Razorpay. The system first creates a pending booking and Razorpay order. After checkout, the backend verifies the Razorpay signature using HMAC SHA-256. If verification succeeds, the booking becomes confirmed. If the user closes checkout or payment fails, the pending booking is cancelled and slot capacity is released.
>
> The project also supports owner-side offline bookings, shared cricket/football courts, weekend pricing, image uploads, and deployment planning for AWS.

## 22. Common Interview Questions and Answers

### What problem does this application solve?

It digitizes turf booking. Players can discover venues and book available slots online, while owners can manage inventory, pricing, and bookings from a dashboard.

### Why did you separate controllers, services, and repositories?

To keep responsibilities clean. Controllers handle HTTP requests and responses, services handle business rules, and repositories handle database queries. This improves maintainability and makes the backend easier to test.

### How do you prevent double booking?

The booking repository uses a database transaction and locks the selected slot row with `FOR UPDATE`. It checks capacity and updates slot status before creating the booking, all inside the same transaction.

### How does half-court booking work?

Each slot has a capacity of 2 units. A full-court booking consumes 2 units. A half-court booking consumes 1 unit. If one unit is used, the slot becomes `PARTIALLY_BOOKED`. If two units are used, it becomes `BOOKED`.

### How is Razorpay integrated?

The backend creates a pending booking and Razorpay order. The frontend opens Razorpay checkout. After payment, the frontend sends payment details to the backend. The backend verifies the signature using the Razorpay secret and confirms the booking only if verification succeeds.

### What happens if payment fails?

The pending booking is cancelled, payment status is marked failed, and slot capacity is released.

### How do owners generate slots?

Owners choose a date range, days of week, start time, end time, and duration. The backend loops through the selected dates and creates time slots using Prisma `createMany` with `skipDuplicates`.

### Why store slot times in UTC?

UTC avoids ambiguity and makes backend storage consistent. The application converts owner-entered IST date/time into UTC before saving.

### What would you improve next?

I would add automated tests around booking transactions and payments, implement Razorpay webhooks, move image uploads to S3, add notifications, and build owner analytics.

## 23. Code Walkthrough Order

When explaining the project to someone, use this order:

1. Start with `client/src/App.tsx` to explain routing.
2. Show `client/src/services/api.ts` to explain how API calls are made.
3. Show `client/src/pages/TurfDetails/TurfDetails.tsx` to explain the booking UI.
4. Show `server/src/app.js` to explain backend route mounting.
5. Show `server/src/modules/payment/payment.service.js` to explain payment order and verification.
6. Show `server/src/modules/booking/booking.repo.js` to explain transaction-safe slot booking.
7. Show `server/prisma/schema.prisma` to explain the database design.
8. Show `client/src/pages/owner/OwnerTurfs/OwnerTurfs.tsx` and `ManageSlotsModal.tsx` to explain the owner workflow.

## 24. Production Deployment Notes

The included `AWS_DEPLOYMENT_GUIDE.md` describes a production architecture:

```text
Users
  -> Route 53
  -> CloudFront + S3 for React frontend
  -> Application Load Balancer
  -> EC2 running Express backend
  -> RDS PostgreSQL
  -> S3 for images
```

Current local implementation serves uploaded images from backend disk storage. For production, the guide recommends moving images to S3.

Production checklist:

- Build frontend with `npm run build`.
- Host frontend build on S3 + CloudFront.
- Run backend on EC2 or a container service.
- Use RDS PostgreSQL.
- Store secrets outside source code.
- Use HTTPS through ACM and ALB.
- Configure strict CORS.
- Run Prisma migrations against production database.
- Move local uploads to S3.
- Add logs and monitoring.

## 25. Quick Mental Model

Think of the app as four connected systems:

1. Identity system:
   Users register/login and receive JWT tokens.

2. Inventory system:
   Owners create turfs, courts, images, prices, and slots.

3. Booking system:
   Players reserve slot capacity safely using transactions.

4. Payment system:
   Razorpay confirms money movement before booking becomes final.

That is the cleanest way to explain the project in an interview.

# BookMyTurf
