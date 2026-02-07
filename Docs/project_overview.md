# Guestify Backend Documentation

## 1. Project Overview
**Guestify Backend** is a robust Node.js application built with **Express.js**, serving as the core API for the Guestify platform. It manages user authentication, property listings (PGs, Hostels), bookings, payments, and communication services. The backend is designed with scalability in mind, utilizing asynchronous processing via **RabbitMQ** and scheduled tasks via **Cron**.

## 2. Technology Stack

### Core Frameworks & Runtime
- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for handling HTTP requests and routing.

### Database & Storage
- **MongoDB** (via **Mongoose**): Primary NoSQL database for storing application data (Users, PGs, Bookings, etc.).
- **Redis** (`ioredis`): In-memory data structure store, likely used for caching or session management.
- **Cloudinary**: Cloud storage service for handling image uploads (PG images, user profiles).

### Messaging & Async Processing
- **RabbitMQ** (`amqplib`): Message broker for handling asynchronous tasks such as sending notifications, emails, and managing wishlist operations.
    - **Queues**: `noti-queue`, `email-queue`, `delete-noti-queue`, `wishlist-queue`, `delete-wishlist-queue`.

### Key Services & Integrations
- **Authentication**: `jsonwebtoken` (JWT) and `bcrypt` for secure authentication and password hashing.
- **Payments**: **Stripe** integration for handling secure online payments.
- **Communication**:
    - **Email**: `nodemailer` and `@sendgrid/mail`.
    - **SMS**: `twilio`.
- **AI & ML**: `@google/genai` for LLM capabilities (Chat Assistant).
- **Scheduled Tasks**: `node-cron` for running periodic maintenance or automated jobs.
- **Utilities**: `compression` (response compression), `cookie-parser`, `cors`.

## 3. Architecture & Design Patterns
The project follows a modular **Release-based Architecture** (similar to MVC) with separation of concerns:

- **Controllers** (`/controller`): Handle incoming HTTP requests, input validation, and send responses. They act as the entry point for API logic.
- **Routes** (`/routes`): Define API endpoints and map them to specific controller functions.
- **Models** (`/models`): Mongoose schemas defining the data structure for MongoDB interactions.
- **Services** (`/services`): Contain business logic (e.g., specific algorithms or complex operations) to keep controllers lean.
- **Lib/Utils** (`/lib`, `/server-utils`): Helper functions, database connections, and middleware.
- **Workers** (`/cron-job-worker`): Background jobs that run on a schedule.

### System Architecture Diagram
```mermaid
graph TD
    Client[Client (Web/Mobile)] -->|HTTP API| LB[Express Server / API Gateway]
    
    subgraph "Core Components"
        LB -->|Routes| Controllers[Controllers]
        Controllers -->|Business Logic| Services[Services]
        Services -->|Data Access| Models[Mongoose Models]
    end
    
    subgraph "Data Store"
        Models --> DB[(MongoDB)]
        Services --> Cache[(Redis)]
    end
    
    subgraph "External Services"
        Services -->|Payments| Stripe[Stripe]
        Services -->|Media| Cloudinary[Cloudinary]
        Services -->|AI Chat| Gemini[Google Gemini]
    end
    
    subgraph "Async Processing"
        Services -->|Publish| RNQ[RabbitMQ]
        RNQ -->|Consume| Workers[Background Workers]
        Workers -->|Email/SMS| Notify[SendGrid / Twilio]
    end
```


## 4. Key Features & Modules

### User Management
- **Authentication**: Signup, Login, Password Reset, OTP verification (Email & SMS).
- **Profiles**: User and Owner profiles with image upload capabilities.
- **Roles**: Distinct flows for Students (Users) and Property Owners.

### Property Management
- **Colleges & Location**: Manage database of colleges and locations to help users find PGs nearby.
- **PGs & Rooms**: Owners can list PGs and Rooms with details (Amenities, Rent, Images).
- **Reviews & Ratings**: Users can review PGs they have stayed in.

### Booking System
- **Room Booking**: End-to-end flow for booking rooms.
- **Payments**: Integration with Stripe for processing booking fees.
- **Wishlist**: Users can save PGs/Rooms for later.

### Communication System
- **Notifications**: Real-time (SSE - Server-Sent Events) and async notifications via RabbitMQ.
- **Chat Assistant**: AI-powered chat interface to assist users.

### Advanced Features
- **Statistics**: Dashboard data for owners/admins.
- **Webhooks**: Handling external events (e.g., Stripe payment confirmation).
- **Extension Support**: Routes for browser extensions or external integrations.

## 5. Project Structure

```
guestify_v2_backend/
├── controller/         # Request handlers
├── routes/             # API Route definitions
├── models/             # Database Schemas
├── services/           # Business logic layer
├── lib/                # Database & Messaging connections (Mongo, Redis, AMQP)
├── cron-job-worker/    # Scheduled task definitions
├── server-utils/       # Helper utilities
├── LLM/                # AI/LLM related logic
├── user-assets/        # Static assets
└── server.js           # Application entry point
```

## 6. Setup and Installation

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Ensure a `.env` file is present in the root directory with necessary keys (DB URI, API Keys for Stripe/Cloudinary/Twilio, etc.).

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    This runs the server with `--watch` mode using Node's built-in watcher.

## 7. Future Documentation Plan: Service Breakdown
The backend will be documented by segregating functionality into the following distinct microservices/domains to facilitate manual updates and feature implementation:

### 1. Identity & Access Management (IAM) Service
Handles all user and owner authentication, profile management, and identity verification.
- **Routes**: `user_route`, `owner_route`, `user_profile_route`, `email_otp_route`, `sms_route`
- **Controllers**: `User`, `Owner`, `UserProfile`, `EmailVerify`, `PhoneSMS`
- **Key Models**: `User`

### 2. Property Management Service
Core service for Property Owners to manage their inventories.
- **Routes**: `pg_route` (listing management), `room_route`, `image_upload_route`
- **Controllers**: `PG` (write operations), `Room`, `ImageUpload`
- **Key Models**: `PGInfo`, `RoomInfo`

### 3. Discovery & Content Service
Handles public-facing search, filtering, and location data.
- **Routes**: `pg_route` (read/search), `college_route`, `location_route`, `local_attraction_route`
- **Controllers**: `PG` (read operations), `College`, `Location`, `Habitates` (Static Data), `LocalAttraction`
- **Key Models**: `College`, `Location`

### 4. Booking Management Service
Manages the end-to-end booking lifecycle, guest details, and reservations.
- **Routes**: `booking_route`
- **Controllers**: `Booking`, `Habitate` (Guest info)
- **Key Models**: `Booking`, `Habitate`

### 5. Payment & billing Service
Handles financial transactions, integration with Stripe, and webhooks.
- **Routes**: `payment_route`, `webhook_route`
- **Controllers**: `Payment`, `Webhooks`
- **Key Models**: `Payment`

### 6. User Engagement Service
Manages user interactions such as reviews and wishlists.
- **Routes**: `review_route`, `wishlist_route`
- **Controllers**: `Review`, `Wishlist`
- **Key Models**: `Review`, `Wishlist`

### 7. Communication Service
Centralized service for sending notifications, emails, and SMS.
- **Routes**: `notification_route`
- **Controllers**: `Notification`, `SSE` (Server Sent Events)
- **Infra**: RabbitMQ (`noti-queue`, `email-queue`), Twilio, SendGrid/Nodemailer

### 8. AI & Intelligence Service
Handles AI chat assistance and LLM features.
- **Routes**: `chat_assistant_route`, `llm_route`, `extension_route`
- **Controllers**: `ChatAssistant`, `Extension`
- **Infra**: Google Gemini API

### 9. Analytics & Reporting Service
Provides statistical data and reports for admins and owners.
- **Routes**: `stat_route`
- **Controllers**: `Statistics`, `DownloadDoc`
- **Key Models**: Aggregated Data

