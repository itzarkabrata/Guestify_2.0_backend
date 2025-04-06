export class Soc_Conn {
  static establish_conn(io) {
    try {
      // configuring socket connection
      io.on("connection", (client_soc) => {

        console.log(`A new socket connection is established with id : ${client_soc.id}`);

        

        client_soc.on("disconnect",()=>{
            console.log("socket disconnected");
        })
      });
    } catch (error) {
        console.error(error);
    }
  }
}
