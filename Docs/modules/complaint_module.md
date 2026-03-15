# Complaint Module Documentation

This document outlines the Complaint Module, providing details on how to integrate and use the RESTful APIs from the frontend. 

## Overview
The Complaint Module allows Users to log issues against the specific PG Room they currently occupy. Admins can view complaints raised against all PGs they manage and update their statuses accordingly.
All actions trigger live Server-Sent AMQP notifications to keep both parties informed.

---

## 1. Mongoose Schema Details

**Model Location**: `models/complaint.js`
**Collection Name**: `complaints`

### Fields

| Field Name | Type | Required? | Restrictions / Notes |
|------------|------|-----------|-----------------------|
| `user_id` | ObjectId | Yes | Reference to User who created the complaint |
| `room_id` | ObjectId | Yes | Reference to RoomInfo |
| `pg_id` | ObjectId | Yes | Reference to PgInfo |
| `subject` | String | Yes | Minimum length enforced via `trim: true` |
| `description` | String | Yes | Minimum length enforced via `trim: true` |
| `complaint_type` | String | No | Enum: `['maintenance', 'cleanliness', 'noise', 'security', 'other']`. Default: `'other'` |
| `priority` | String | No | Enum: `['low', 'medium', 'high', 'urgent']`. Default: `'medium'` |
| `image_url` | String | No | URL of the attached image (optional) |
| `image_public_id`| String | No | Public ID of the image for deletion (optional) |
| `status` | String | No | Enum: `['pending', 'in_progress', 'resolved', 'closed']`. Default: `'pending'` |
| `resolution_details`| String | No | Admin's resolution notes |
| `resolved_at` | Date | No | Timestamp set by server when status changes to resolved/closed |
| `createdAt` | Date | Auto | Timestamp created via `timestamps: true` |
| `updatedAt` | Date | Auto | Timestamp updated via `timestamps: true` |

---

## 2. API Endpoints

**Base Path**: `/backend/complaint`
**Middleware**: `isLoggedIn` (Authorization token required for all endpoints)

All responses follow the standardize nested `ApiResponse` structure:
```json
{
  "data": <Data_Object_Or_Array>,
  "message": "Success/Error Message",
  "success": true/false,
  "statusCode": 200/201/400/500,
  ...
}
```

### 2.1 Log a New Complaint
- **Method:** `POST`
- **Route:** `/`
- **Scope:** **Users Only** (Admins cannot lodge complaints).
- **Validation:** Server verifies the User has an active/un-canceled booking for the `room_id` provided.

#### Request Body
```json
{
  "room_id": "60c72b2f9b1d8b0015f3a9e1",
  "pg_id": "60c72b2f9b1d8b0015f3a9e2",
  "subject": "Leaking Pipe in Bathroom",
  "description": "The shower pipe is leaking constantly causing water to pool.",
  "complaint_type": "maintenance",       // Optional
  "priority": "high",                    // Optional
  "image_url": "https://...",            // Optional
  "image_public_id": "abc123yz"          // Optional
}
```

#### Success Response (201 Created)
Returns the created complaint object. Also triggers an AMQP Notification to the Admin of the PG.

---

### 2.2 Get Complaints
- **Method:** `GET`
- **Route:** `/`
- **Scope:** **Users and Admins**

#### Behavior:
- **If User:** Returns all complaints lodged by the requesting User.
- **If Admin:** Returns all complaints logged against any `PgInfo` owned by the requesting Admin.

#### Query Parameters (Optional Filters)
- `?status=pending,in_progress` (Supports single or comma-separated multiple values)
- `?priority=high,urgent` (Supports single or comma-separated multiple values)

#### Success Response (200 OK)
Returns an array of Complaints populated with reference details (`user_id`, `room_id`, `pg_id`).

```json
{
  "data": [
    {
      "_id": "60c72b2f...",
      "subject": "Leaking Pipe...",
      "status": "pending",
      "user_id": { "_id": "...", "first_name": "...", "email": "..." },
      "room_id": { "_id": "...", "room_type": "single", "room_rent": 5000 },
      "pg_id": { "_id": "...", "pg_name": "Sunshine PG", "location": {...} },
      ...
    }
  ],
  "count": 1,
  "message": "Complaints fetched successfully."
}
```

---

### 2.3 Update a Complaint
- **Method:** `PATCH`
- **Route:** `/:id`
- **Scope:** **Users Only**

#### Behavior:
- Can only update the `subject`, `description`, `complaint_type`, `priority`, `image_url`, and `image_public_id`.
- **Restriction:** Users can ONLY update a complaint if its status is **`pending`**. If it is `in_progress`, `resolved`, or `closed`, an error is returned.

#### Request Body (User Example)
```json
{
  "description": "The pipe broke completely, it's flooded now.",
  "priority": "urgent"
}
```

#### Success Response (200 OK)
Returns the updated complaint object.

---

### 2.4 Change Complaint Status
- **Method:** `PATCH`
- **Route:** `/:id/status`
- **Scope:** **Admins Only**

#### Behavior:
- Admins use this endpoint to update the `status` and `resolution_details` of a complaint.
- Admin must own the PG (`pg_id`) associated with the complaint.
- Setting `status` to `resolved` or `closed` automatically sets the `resolved_at` timestamp.
- **Notification:** Changing the status triggers an AMQP notification to the User.

#### Request Body (Admin Example)
```json
{
  "status": "in_progress",
  "resolution_details": "Plumber scheduled for tomorrow morning."
}
```

#### Success Response (200 OK)
Returns the updated complaint object.

---

### 2.5 Delete a Complaint
- **Method:** `DELETE`
- **Route:** `/:id`
- **Scope:** **Users and Admins**

#### Behavior:
**If User:**
- Can retract/delete their own complaints **only if** the status is `pending`.
- **Notification:** Triggers an AMQP notification to the Admin warning that the user retracted the complaint.

**If Admin:**
- Authorized to delete any complaint logged against a PG they own.

#### Success Response (200 OK)
```json
{
  "data": null,
  "message": "Complaint deleted successfully.",
  "success": true,
  "statusCode": 200
}
```

---

## 3. Real-Time AMQP Notifications

The Controller integrates closely with `amqp.connect.js` and `noti-queue`. The frontend should listen for Server-Sent Events (SSE) from the Notification route to update the UI dynamically. 

**Triggered Events:**
1. **New Complaint (Admin Alert):** When User `POST`s a complaint, Admin receives an `info` alert.
2. **Status Update (User Alert):** When Admin updates status via `PATCH`, User receives an `info` alert.
3. **Complaint Retracted (Admin Alert):** When User `DELETE`s a pending complaint, Admin receives a `warning` alert.
