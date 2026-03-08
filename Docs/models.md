# Database Models Documentation

This document describes the Mongoose models and schemas used in the Guestify 2.0 Backend.

---

## 1. User (`models/users.js`)
Represents the registered users of the application (both regular users and admins).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | String | Yes | Min length: 2 |
| `last_name` | String | Yes | Min length: 2 |
| `email` | String | Yes | Unique, Valid email format |
| `password` | String | Yes | Hashed password |
| `is_admin` | Boolean | No | Default: `false` |
| `mother_tongue` | String | No | Enum: `bengali`, `english`, `hindi` |
| `gender` | String | No | Enum: `male`, `female`, `others` |
| `address`, `district` | String | No | Location details |
| `pincode` | Number | No | 6-digit validation |

---

## 2. PgInfo (`models/pginfo.js`)
Represents a Paying Guest (PG) accommodation listing.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | ObjectId | Yes | Ref: `User` (Owner) |
| `pg_name` | String | Yes | Name of the PG |
| `pg_type` | String | Yes | Enum: `boys`, `girls`, `both` |
| `address`, `district`, `state` | String | Yes | Location details |
| `pincode` | Number | Yes | 6-digit validation |
| `location` | GeoJSON | Yes | Point coordinates (2dsphere index) |
| `wifi_available`, `food_available` | String | Yes | Enum: `yes`, `no` |
| `pg_images` | Array | Yes | List of image URLs and IDs |
| `attractions` | Array | No | Ref: `Attraction` |

---

## 3. RoomInfo (`models/roominfo.js`)
Represents a specific room type within a PG.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pg_id` | ObjectId | Yes | Ref: `PgInfo` |
| `room_type` | String | Yes | Enum: `single`, `double`, `triple` |
| `room_rent` | Number | Yes | Monthly rent |
| `deposit_duration` | String | Yes | Enum: `monthly`, `quarterly`, etc. |
| `ac_available`, `attached_bathroom` | String | Yes | Enum: `yes`, `no` |
| `room_images` | Array | Yes | List of room images |
| `booked_by` | ObjectId | No | Ref: `User` |

---

## 4. Booking (`models/booking.js`)
Represents a booking request or active booking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `room_id` | ObjectId | Yes | Ref: `RoomInfo` |
| `user_id` | ObjectId | Yes | Ref: `User` (Tenant) |
| `admin_id` | ObjectId | Yes | Ref: `User` (Owner) |
| `start_date` | Date | Yes | Booking start date |
| `duration` | Object | Yes | `{ year: Number, month: Number }` |
| `accepted_at`, `declined_at`, `canceled_at` | Date | No | Status timestamps |
| `remarks` | String | No | Additional notes |

---

## 5. Habitate (`models/habitate.js`)
Stores details of the actual resident(s) for a booking (can be different from the booker).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `booking_id` | ObjectId | No | Ref: `Booking` |
| `first_name`, `last_name` | String | Yes | Resident name |
| `age`, `gender` | Number/String | Yes | Demographics |
| `identity_id`, `type_of_identity` | String | Yes | Govt ID details |
| `image`, `identity_image` | String | Yes | Uploaded documents |
| `is_primary` | Number | No | 1 if primary resident |

---

## 6. Payment (`models/payment.js`)
Tracks payment transactions for bookings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `booking_id` | ObjectId | Yes | Ref: `Booking` |
| `amount` | Number | Yes | Payment amount |
| `payment_status` | String | No | Enum: `pending`, `paid`, `failed`, `refunded` |
| `payment_method` | String | No | Enum: `card`, `upi`, etc. |
| `transaction_id` | String | No | Gateway Transaction ID |
| `intent` | Object | Yes | Payment intent details (name, email) |

---

## 7. Review (`models/reviews.js`)
User reviews and ratings for a PG.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pg_id` | ObjectId | Yes | Ref: `PgInfo` |
| `full_name` | String | Yes | Reviewer name |
| `rating` | Number | Yes | 1-5 Scale |
| `feedback` | String | No | Text review |
| `email` | String | Yes | Reviewer email |

---

## 8. Wishlist (`models/wishlist.js`)
Users' saved PGs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | ObjectId | Yes | Ref: `User` |
| `pg_id` | ObjectId | Yes | Ref: `PgInfo` |

*Compound Index constraint: `{ user_id: 1, pg_id: 1 }` (Unique)*

---

## 9. Notification (`models/notification.js`)
In-app notifications history.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipient` | ObjectId | No | Ref: `User` |
| `message` | String | Yes | Notification content |
| `category` | String | No | Enum: `info`, `warning`, `success`, `error` |
| `notification_type` | String | Yes | Enum: `transactional`, `broadcast`, etc. |
| `isRead` | Boolean | No | Default: `false` |

---

## 10. ContactDetail (`models/owner.js`)
Extended contact information for PG Owners.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | ObjectId | Yes | Ref: `User` |
| `pg_id` | ObjectId | Yes | Ref: `PgInfo` |
| `phone_number`, `whatsapp_number` | String | No | Contact numbers |
| `preferred_contact` | String | No | Enum: `phone`, `email`, `whatsapp` |

---

## 11. Extension (`models/extensions.js`)
Marketplace extensions or plugins.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name`, `slug` | String | Yes | Unique identifiers |
| `users` | Array | No | List of users who installed it |
| `install_count` | Number | No | Stats |

---

## 12. College (`models/colleges.js`)
Database of colleges for location-based searching.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `college_name` | String | Yes | Unique name |
| `address`, `district` | String | Yes | Location |
| `pincode` | Number | Yes | 6-digit validation |

---

## 13. Attraction (`models/local_attractions.js`)
Local points of interest near PGs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `place_name` | String | Yes | Name |
| `type` | String | Yes | Enum: `museum`, `park`, etc. |
| `time_taken_minutes` | Number | Yes | Proximity indicator |
| `createdBy` | ObjectId | Yes | Ref: `User` |

---

## 14. Chat (`models/chat_assistant.js`)
Chat logs for the AI Assistant.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | String | No | Session Identifier |
| `userId` | ObjectId | No | Ref: `User` |
| `role` | String | Yes | `system`, `user`, `assistant` |
| `content` | String | Yes | Message text |

*TTL Index: Expires after 24 hours.*

---

## 15. KnowledgeVector (`models/knowledge_vector.js`)
Vector embeddings for RAG (Retrieval-Augmented Generation).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | String | No | Text chunk |
| `embedding` | Array | Yes | Vector numbers |
| `source`, `domain` | String | No | Metadata |

---

## Usage Guide & Demo Implementation

This section provides code snippets for common operations using the models above.

### 1. Basic CRUD Operations

Example using `User_Model`:

```javascript
import { User_Model } from "../models/users.js";

// Create
const newUser = await User_Model.create({
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  password: hashedPassword // Ensure password is hashed
});

// Read
const user = await User_Model.findOne({ email: "john@example.com" });

// Update
await User_Model.updateOne({ _id: user._id }, { $set: { is_admin: true } });

// Delete
await User_Model.deleteOne({ _id: user._id });
```

### 2. Deep Population

To fetch a Booking along with its Room and the PG that room belongs to:

```javascript
import { Booking_Model } from "../models/booking.js";

const booking = await Booking_Model.findById(bookingId)
  .populate({
    path: "room_id",
    populate: {
      path: "pg_id",
      model: "PgInfo"
    }
  })
  .populate("user_id", "first_name last_name email");

console.log(booking.room_id.pg_id.pg_name); // Access nested data
```

### 3. Geospatial Queries

Finding PGs within 5km of a specific location:

```javascript
import { PgInfo_Model } from "../models/pginfo.js";

const pgsNearMe = await PgInfo_Model.find({
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude] // e.g., [88.3639, 22.5726]
      },
      $maxDistance: 5000 // Distance in meters
    }
  }
});
```

### 4. Aggregation Pipeline

Example: Counting double occupancy rooms per PG:

```javascript
import { RoomInfo_Model } from "../models/roominfo.js";

const stats = await RoomInfo_Model.aggregate([
  { $match: { room_type: "double" } },
  { $group: { _id: "$pg_id", doubleRoomsCount: { $sum: 1 } } }
]);
```

### 5. Using Transactions

Critical for operations involving multiple collections (e.g., creating a booking and updating room status):

```javascript
import mongoose from "mongoose";
import { Booking_Model } from "../models/booking.js";
import { RoomInfo_Model } from "../models/roominfo.js";

const session = await mongoose.startSession();
session.startTransaction();

try {
  const booking = await Booking_Model.create([bookingData], { session });
  
  await RoomInfo_Model.updateOne(
    { _id: roomId },
    { $set: { booking_status: "pending" } },
    { session }
  );

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```
