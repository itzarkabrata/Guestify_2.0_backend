# Server-Sent Events (SSE) for Real-time Notifications

## Overview

This implementation adds real-time notification capabilities to the Guestify 2.0 backend using Server-Sent Events (SSE). SSE is a standard that enables servers to push updates to clients over HTTP connections, making it ideal for real-time notifications.

## Features

- Real-time notification delivery to clients
- Authentication via JWT token or device token
- Initial notification history on connection
- Automatic reconnection on connection loss
- Compatible with all modern browsers

## API Endpoints

### Subscribe to Notifications

```
GET /backend/notifications/subscribe
```

**Headers:**
- `Authorization`: Bearer JWT token (for authenticated users)
- `devicetoken`: Device token (for non-authenticated users)

**Response:**
A stream of SSE events containing notification data.

## How It Works

1. The client establishes an SSE connection to the `/backend/notifications/subscribe` endpoint
2. The server authenticates the client using either JWT token or device token
3. The server sends the initial list of notifications
4. When new notifications are created, they are automatically pushed to connected clients
5. The connection remains open until the client disconnects

## Implementation Details

### Backend

- The `Notification` class has been extended with SSE support
- Socket.io is used for internal event handling
- When a new notification is created, it's emitted to relevant clients
- The server maintains a list of connected clients and their authentication status

### Client-Side Integration

A sample client implementation is provided in `sse-client-example.js`. This demonstrates how to:

1. Connect to the SSE endpoint
2. Handle incoming notifications
3. Manage connection errors and reconnection
4. Display notifications to users

## Usage Example

```javascript
// Connect to notifications with JWT token
const eventSource = new EventSource('http://localhost:3000/backend/notifications/subscribe', {
  withCredentials: true
});

// Set up event handlers
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received notification:', data);
  // Update UI with notification
};

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
  // Handle reconnection
};
```

## Benefits Over HTTP Polling

- Reduced server load (no constant polling)
- Lower latency (immediate notification delivery)
- Simplified client implementation
- Better battery life for mobile devices

## Considerations

- SSE connections count against browser connection limits (typically 6 per domain)
- Long-lived connections require proper server configuration
- Some proxies may buffer responses, affecting real-time delivery

## Troubleshooting

- If notifications aren't being received, check authentication headers
- Ensure the server's CORS settings allow your client domain
- For production, configure your proxy (Nginx, etc.) to support SSE connections