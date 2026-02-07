# API Response Structure Documentation

This document defines the standardized API response structure for the Guestify 2.0 Backend API. All API endpoints should follow these conventions to ensure consistency across the application.

---

## Table of Contents

- [Overview](#overview)
- [Response Classes](#response-classes)
  - [ApiResponse Class](#apiresponse-class)
  - [ApiError Classes](#apierror-classes)
- [Success Response Structure](#success-response-structure)
- [Error Response Structure](#error-response-structure)
- [HTTP Status Codes](#http-status-codes)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

---

## Overview

The Guestify 2.0 backend uses two main utility classes to standardize API responses:

1. **`ApiResponse`** - Located at [`server-utils/ApiResponse.js`](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/server-utils/ApiResponse.js)
2. **`ApiError`** - Located at [`server-utils/ApiError.js`](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/server-utils/ApiError.js)

These classes ensure that all API responses follow a consistent structure, making it easier for frontend applications to handle responses predictably.

---

## Response Classes

### ApiResponse Class

The `ApiResponse` class is the primary handler for all API responses (both success and error).

#### Constructor

```javascript
constructor(
  statusCode = 200,
  data = null,
  message = "Request Successful",
  success = null,
  error = ""
)
```

#### Static Methods

##### 1. `ApiResponse.success()`

Used for successful API responses.

```javascript
ApiResponse.success(
  res,                              // Express response object
  data = null,                      // Response data (object, array, or null)
  message = "Request Successful",   // Success message
  statusCode = 200                  // HTTP status code (default: 200)
)
```

##### 2. `ApiResponse.error()`

Used for error API responses.

```javascript
ApiResponse.error(
  res,                                 // Express response object
  message = "Something Went Wrong",    // Error message
  statusCode = 500,                    // HTTP status code (default: 500)
  error = ""                           // Error details (optional)
)
```

#### Additional Features

- **Array Count**: When `data` is an array, the response automatically includes a `count` property with the array length.

---

### ApiError Classes

The project provides specialized error classes that extend the base `ApiError` class. Each error class is associated with a specific HTTP status code.

#### Base ApiError Class

```javascript
constructor(
  statusCode = 500,
  message = "Something Went Wrong",
  error = "",
  stack = ""
)
```

#### Specialized Error Classes

| Error Class | Status Code | Default Message | Use Case |
|------------|-------------|-----------------|----------|
| `TypeError` | 422 | "Type Mismatch Error" | Data type validation errors |
| `AuthorizationError` | 403 | "Authorization Error" | Permission/access denied errors |
| `TokenExpirationError` | 401 | "Token Expired Error" | Expired or invalid authentication tokens |
| `EvalError` | 400 | "Evaluation Error" | Validation or business logic errors |
| `InternalServerError` | 500 | "Internal Server Error" | Server-side errors |
| `NotFoundError` | 404 | "Resource Not Found" | Resource not found errors |

---

## Success Response Structure

### JSON Response Format

```json
{
  "data": <any>,
  "message": "string",
  "success": true,
  "statusCode": <number>,
  "error": "",
  "count": <number>  // Only present when data is an array
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `data` | any | The response payload (object, array, string, number, or null) |
| `message` | string | Human-readable success message |
| `success` | boolean | Always `true` for successful responses |
| `statusCode` | number | HTTP status code (typically 200, 201) |
| `error` | string | Always an empty string for success responses |
| `count` | number | *(Optional)* Number of items if `data` is an array |

### Examples

#### Success with Data Object

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "507f1f77bcf86cd799439011",
    "is_admin": false
  },
  "message": "User Logged in successfully",
  "success": true,
  "statusCode": 200,
  "error": ""
}
```

#### Success with Array Data

```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com"
    }
  ],
  "message": "Users fetched successfully",
  "success": true,
  "statusCode": 200,
  "error": "",
  "count": 2
}
```

#### Success with No Data

```json
{
  "data": null,
  "message": "User registered successfully, Please Login with the email-id and password",
  "success": true,
  "statusCode": 200,
  "error": ""
}
```

---

## Error Response Structure

### JSON Response Format

```json
{
  "data": null,
  "message": "string",
  "success": false,
  "statusCode": <number>,
  "error": "string"
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `data` | null | Always `null` for error responses |
| `message` | string | User-friendly error message describing what went wrong |
| `success` | boolean | Always `false` for error responses |
| `statusCode` | number | HTTP error status code (400, 401, 403, 404, 422, 500, etc.) |
| `error` | string | Technical error details or additional error information |

### Examples

#### Type Error (422)

```json
{
  "data": null,
  "message": "Users Registration not done successfully",
  "success": false,
  "statusCode": 422,
  "error": "Email must be of type string"
}
```

#### Authorization Error (403)

```json
{
  "data": null,
  "message": "User Authorization failed in isLoggedIn middleware",
  "success": false,
  "statusCode": 403,
  "error": "User Authorization failed : Authorization header not available"
}
```

#### Token Expiration Error (401)

```json
{
  "data": null,
  "message": "User Authorization failed",
  "success": false,
  "statusCode": 401,
  "error": "User Authorization failed : Invalid or Expired Token"
}
```

#### Evaluation Error (400)

```json
{
  "data": null,
  "message": "Users Registration not done successfully",
  "success": false,
  "statusCode": 400,
  "error": "Email already exists. Please try another email or Login with your existing email"
}
```

#### Not Found Error (404)

```json
{
  "data": null,
  "message": "Forget Token not delivered successfully",
  "success": false,
  "statusCode": 404,
  "error": "User with given email-id not exists"
}
```

#### Internal Server Error (500)

```json
{
  "data": null,
  "message": "Users are not fetched successfully",
  "success": false,
  "statusCode": 500,
  "error": "Database server is not connected properly"
}
```

---

## HTTP Status Codes

The following HTTP status codes are commonly used in the Guestify 2.0 API:

| Status Code | Meaning | When to Use |
|-------------|---------|-------------|
| **200** | OK | Successful GET, PUT, PATCH, DELETE requests |
| **201** | Created | Successful POST request that creates a resource |
| **400** | Bad Request | Validation errors, business logic errors |
| **401** | Unauthorized | Authentication failed or token expired |
| **403** | Forbidden | User lacks permission to access resource |
| **404** | Not Found | Requested resource doesn't exist |
| **422** | Unprocessable Entity | Data type validation errors |
| **500** | Internal Server Error | Server-side errors, database connection issues |

---

## Usage Examples

### Example 1: Successful User Registration

```javascript
import { ApiResponse } from "../server-utils/ApiResponse.js";

static async RegisterUser(req, res) {
  try {
    // ... registration logic ...
    
    return ApiResponse.success(
      res,
      null,
      "User registered successfully, Please Login with the email-id and password"
    );
  } catch (error) {
    // Error handling in Example 2
  }
}
```

### Example 2: Error Handling with Custom Error Classes

```javascript
import {
  ApiError,
  TypeError,
  EvalError,
  InternalServerError
} from "../server-utils/ApiError.js";
import { ApiResponse } from "../server-utils/ApiResponse.js";

static async RegisterUser(req, res) {
  try {
    const { first_name, email, password } = req.body;
    
    // Type validation
    if (!(typeof email === "string")) {
      throw new TypeError("Email must be of type string");
    }
    
    // Business logic validation
    const existingUser = await User_Model.find({ email });
    if (existingUser.length !== 0) {
      throw new EvalError(
        "Email already exists. Please try another email or Login with your existing email"
      );
    }
    
    // Database connection check
    if (!(await Database.isConnected())) {
      throw new InternalServerError(
        "Database server is not connected properly"
      );
    }
    
    // ... registration logic ...
    
    return ApiResponse.success(
      res,
      null,
      "User registered successfully"
    );
  } catch (error) {
    console.error(error.message);
    
    if (error instanceof ApiError) {
      return ApiResponse.error(
        res,
        "Users Registration not done successfully",
        error.statusCode,
        error.message
      );
    } else {
      return ApiResponse.error(
        res,
        "Users Registration not done successfully",
        500,
        error.message
      );
    }
  }
}
```

### Example 3: Returning Array Data with Count

```javascript
import { ApiResponse } from "../server-utils/ApiResponse.js";

static async getAllUsers(_req, res) {
  try {
    const users_list = await User_Model.find();
    
    // When data is an array, count is automatically added
    return ApiResponse.success(
      res,
      users_list,
      "Users fetched successfully"
    );
    // Response will include: { ..., data: [...], count: <array.length>, ... }
  } catch (error) {
    // Error handling...
  }
}
```

### Example 4: Returning Object Data

```javascript
import { ApiResponse } from "../server-utils/ApiResponse.js";

static async loginUser(req, res) {
  try {
    const { email, password } = req.body;
    
    // ... authentication logic ...
    
    return ApiResponse.success(
      res,
      {
        token: token,
        user_id: user._id,
        is_admin: user.is_admin
      },
      "User Logged in successfully"
    );
  } catch (error) {
    // Error handling...
  }
}
```

---

## Best Practices

### 1. **Always Use ApiResponse Class**

✅ **DO:**
```javascript
return ApiResponse.success(res, data, "Success message");
return ApiResponse.error(res, "Error message", 400, "Detailed error");
```

❌ **DON'T:**
```javascript
return res.status(200).json({ 
  success: true, 
  data: data 
}); // Inconsistent structure
```

### 2. **Use Appropriate Error Classes**

✅ **DO:**
```javascript
if (!(typeof email === "string")) {
  throw new TypeError("Email must be of type string");
}

if (!user) {
  throw new NotFoundError("User not found");
}

if (!hasPermission) {
  throw new AuthorizationError("Access denied");
}
```

❌ **DON'T:**
```javascript
throw new Error("Email must be of type string"); // Generic error
```

### 3. **Consistent Error Handling Pattern**

✅ **DO:**
```javascript
try {
  // ... logic ...
} catch (error) {
  console.error(error.message);
  
  if (error instanceof ApiError) {
    return ApiResponse.error(
      res,
      "Operation failed",
      error.statusCode,
      error.message
    );
  } else {
    return ApiResponse.error(
      res,
      "Operation failed",
      500,
      error.message
    );
  }
}
```

### 4. **Meaningful Messages**

✅ **DO:**
```javascript
ApiResponse.success(res, data, "Users fetched successfully");
ApiResponse.error(res, "User registration failed", 400, "Email already exists");
```

❌ **DON'T:**
```javascript
ApiResponse.success(res, data, "OK"); // Too vague
ApiResponse.error(res, "Error", 400, ""); // No details
```

### 5. **Proper Status Codes**

Use appropriate HTTP status codes based on the operation:

- **200**: Successful read/update/delete
- **201**: Successful creation
- **400**: Client-side validation errors
- **401**: Authentication failures
- **403**: Authorization/permission failures
- **404**: Resource not found
- **422**: Type/format validation errors
- **500**: Server-side errors

### 6. **Data Field Usage**

✅ **DO:**
```javascript
// Return data when available
ApiResponse.success(res, userData, "User fetched");

// Return null when no data to return
ApiResponse.success(res, null, "User deleted successfully");
```

❌ **DON'T:**
```javascript
// Don't return empty objects when null is more appropriate
ApiResponse.success(res, {}, "User deleted successfully");
```

### 7. **Error Field Usage**

The `error` field in `ApiResponse.error()` should contain:
- Technical error details
- Validation failure specifics
- Database error messages (sanitized)
- Stack traces (in development only)

```javascript
// Good: Specific error detail
ApiResponse.error(
  res,
  "Password validation failed",
  422,
  "Password must be 8-20 characters with 1 uppercase, 1 number, and 1 special character."
);
```

---

## Common API Patterns in Guestify 2.0

Based on the [`user_class.js`](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/controller/user_class.js) controller, here are common patterns:

### Pattern 1: Type Validation

```javascript
if (!(typeof email === "string")) {
  throw new TypeError("Email must be of type string");
}

if (!(typeof is_admin === "boolean")) {
  throw new TypeError("is_admin must be of type boolean");
}
```

### Pattern 2: Database Connection Check

```javascript
if (await Database.isConnected()) {
  // Proceed with database operations
} else {
  throw new InternalServerError(
    "Database server is not connected properly"
  );
}
```

### Pattern 3: Token Verification

```javascript
const auth_token = req.headers["authorization"];

if (!auth_token) {
  throw new AuthorizationError(
    "User Authorization failed : Authorization header not available"
  );
}

try {
  const decoded_token = await jwt.verify(
    auth_token.split(" ")[1],
    process.env.JWT_SECRET_KEY
  );
} catch (err) {
  throw new TokenExpirationError(
    "User Authorization failed : Invalid or Expired Token"
  );
}
```

### Pattern 4: Resource Existence Check

```javascript
const user = await User_Model.find({ email: email });

if (user.length === 0) {
  throw new NotFoundError("User with given email-id not exists");
}
```

---

## Summary

Following this API response structure ensures:

- ✅ **Consistency** across all endpoints
- ✅ **Predictable** frontend integration
- ✅ **Clear error handling** and debugging
- ✅ **Better developer experience**
- ✅ **Maintainable codebase**

All new controllers and endpoints should adhere to these standards. When refactoring existing controllers, update them to match this structure.

---

## Related Files

- [ApiResponse.js](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/server-utils/ApiResponse.js) - Response utility class
- [ApiError.js](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/server-utils/ApiError.js) - Error utility classes
- [user_class.js](file:///C:/Arkabrata%20Chandra%20Personal%20Projects/Website/guestify_v2_backend/controller/user_class.js) - Reference implementation example
