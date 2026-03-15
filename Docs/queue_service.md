# Queue Service Documentation

This document outlines the architecture and implementation of the Queue Service in the Guestify 2.0 Backend, facilitated by AMQP (Advanced Message Queuing Protocol) using `amqplib`.

---

## Overview

The Queue Service allows for asynchronous processing of tasks such as sending notifications, emails, and managing wishlist items. This decouples time-consuming operations from the main request-response cycle.

## Architecture

The system uses a **Producer-Consumer** model where:
- **Producers** (Controllers) publish messages to specific queues.
- **Consumers** (AMQP Service) listen to these queues and process messages in the background.

---

## Service Breakdown

### 1. Notification Service (`noti-queue`)

Handles in-app notifications for users.

- **Queue Name**: `noti-queue`
- **Payload Structure**: Defined by `EventObj.createEventObj` in `lib/event.config.js`.
- **Consumer Logic**: 
  - Listens to `noti-queue`.
  - Parses the message.
  - Calls `NewNotification.createNotification` to save the notification in the database.
  - Acknowledges the message upon success.

#### Payload Example
```javascript
{
  "recipient": "user_id_123",
  "device_token": "fcm_token_xyz",
  "notification_type": "transactional",
  "category": "success",
  "message": "Registration done in the account",
  "isRead": false,
  "date_of_noti": "2/7/2026, 5:30:00 PM"
}
```

---

### 2. Email Service (`email-queue`)

Handles all email communications using SendGrid (via `@sendgrid/mail`).

- **Queue Name**: `email-queue`
- **Files Involved**:
  - `lib/email/email.config.js`: Contains `Nodemailer` class for sending emails.
  - `lib/email/dynamicmail.js`: Manages HTML template selection and dynamic content injection.
  - `lib/email/emailtemp/`: Directory containing HTML templates.
- **Consumer Logic**:
  - Listens to `email-queue`.
  - Calls `Nodemailer.sendMail` with the payload data.
  - `Nodemailer` selects the appropriate HTML template using `dynamicmail.js`.
  - Sends the email using SendGrid API.

#### Supported Email Types
The `dynamicmail.js` maps types to specific templates:

| Type | Template File | Use Case |
|------|---------------|----------|
| `welcome` | `welcome.html` | User registration welcome email |
| `forgot-password` | `forgot-password.html` | Password reset link |
| `verify-email` | `verify-email.html` | OTP for email verification |
| `new-pg` | `new-pg.html` | New PG listing confirmation |
| `user-booking` | `user-booking.html` | Booking confirmation for user |
| `admin-booking` | `admin-booking.html` | Booking notification for admin |
| `test` | `test.html` | Testing purposes |

#### Payload Example
```javascript
{
  "recepient_email": "user@example.com",
  "subject": "Welcome to Guestify!",
  "type": "welcome",
  "data": { 
    "userName": "John Doe",
    "login_url": "https://..."
  },
  "successMessage": "Email Sent",
  "failureMessage": "Email Failed"
}
```

---

### 3. Wishlist Service (`wishlist-queue`)

Handles adding or removing items from user wishlists asynchronously.

- **Queue Name**: `wishlist-queue`
- **Consumer Logic**: `AMQP.consumeWishlistItem` processes `create` or `delete` actions on `Wishlist_Model`.

---

## Key Implementation Logic

### 1. Consuming Emails (`lib/amqp.connect.js`)

This method listens to the `email-queue` and triggers the email sending process.

```javascript
static async consumeEmail(queue) {
  await AMQP.channel.consume(queue, async (message) => {
    if (message !== null) {
      try {
        // Parse message content
        const payload = JSON.parse(message.content);
        
        // Pass payload values independently to Nodemailer
        await Nodemailer.sendMail(...Object.values(payload));

        // Acknowledge success
        AMQP.channel.ack(message);

      } catch (error) {
        console.log(error.message);
        // Acknowledge to prevent queue blocking (or move to DLQ manually)
        AMQP.channel.ack(message);
      }
    }
  });
}
```

### 2. Sending Emails via SendGrid (`lib/email/email.config.js`)

The `Nodemailer` class uses `@sendgrid/mail` to dispatch emails.

```javascript
static async sendMail(recepient_email, subject, type, data, successMessage, failureMessage) {
  try {
    const mailOptions = {
      from: process.env.MAIL_ID,
      to: recepient_email,
      subject: subject,
      html: getContentByType(type, data), // Generates HTML
    };

    const info = await sgMail.send(mailOptions);
    
    if (info[0].statusCode === 202) {
      return { success: true, message: successMessage };
    } else {
      return { success: false, message: failureMessage };
    }
  } catch (error) {
    return { success: false, message: failureMessage + " : " + error.message };
  }
}
```

### 3. Dynamic Template Selection (`lib/email/dynamicmail.js`)

HTML content is generated based on the email type.

```javascript
function getContentByType(type, data) {
  switch (type) {
    case "welcome":
      return EmailContent.Welcome({ ...data });
    case "forgot-password":
      return EmailContent.ForgotPassword({ ...data });
    // ...other cases
    default:
      break;
  }
}
```

---

## Controller Integration Guide

To integrate the AMQP service into any controller (e.g., `controller/user_class.js`), follow these steps:

### 1. Import Dependencies

Import the `AMQP` service and the `EventObj` helper.

```javascript
import { AMQP } from "../lib/amqp.connect.js";
import { EventObj } from "../lib/event.config.js";
```

### 2. Create the Event Payload

Use the `EventObj` helper methods (`createEventObj`, `createMailEventObj`, or `createWishlistEventObj`) to construct a standardized message object.

```javascript
// Example: Creating a notification payload
const msg = JSON.stringify(
  EventObj.createEventObj(
    "transactional",                     // Type
    "Operation completed successfully",  // Message
    false,                               // isRead
    "success",                           // Category
    user_id,                             // Recipient ID
    req.headers["devicetoken"]           // Device Token
  )
);
```

### 3. Publish to Queue

Use the appropriate `AMQP.publish...` method to send the message to the desired queue.

```javascript
// Publish to Notification Queue
AMQP.publishMsg("noti-queue", msg);

// or Publish to Email Queue
AMQP.publishEmail("email-queue", email_msg);
```

---

## Connection Management

Managed via `AMQP.establishConn` in `lib/amqp.connect.js`. It explicitly connects to the AMQP server and creates a channel.

## Reliability & Error Handling (DLQ)

To ensure no data is lost during processing failures, a **Dead Letter Queue (DLQ)** mechanism is implemented manually.

1. **Processing Failure**: If an error occurs during consumption (e.g., database down, email API error).
2. **Publish to DLQ**: The failed message is published to a specialized DLQ (e.g., `delete-noti-queue` or `delete-wishlist-queue`).
3. **Primary Ack**: The original message is acknowledged to remove it from the primary queue.
4. **Retry/Review**: A separate consumer (`consumeMsg_DLQ`) can process these failed messages or they can be inspected for debugging.

```javascript
// Example from AMQP.consumeMsg
} catch (error) {
  // Move to DLQ
  AMQP.publishMsg_DLQ("delete-noti-queue", message.content);
  // Remove from main queue
  AMQP.channel.ack(message);
}
```
