export class Soc_Conn {
  static establish_conn(io) {
    try {
      // configuring socket connection
      io.on("connection", (client_soc) => {
        console.log(`A new socket connection is established with id : ${client_soc.id}`);
        
        // Handle user authentication for notifications
        client_soc.on("authenticate", (data) => {
          if (data.userId) {
            // Join user-specific room for notifications
            client_soc.join(`user-${data.userId}`);
            console.log(`User ${data.userId} authenticated for notifications`);
          }
          
          if (data.deviceToken) {
            // Join device-specific room for notifications
            client_soc.join(`device-${data.deviceToken}`);
            console.log(`Device ${data.deviceToken} authenticated for notifications`);
          }
        });

        client_soc.on("disconnect", () => {
          console.log(`Socket disconnected: ${client_soc.id}`);
        });
      });
    } catch (error) {
      console.error("Socket connection error:", error);
    }
  }
}
