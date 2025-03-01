// Importing Modules
import mongoose from "mongoose";

export class Database {
  static async createMongoConnection() {
    try {
      await mongoose.connect(process.env.MONGO_URI,{
        serverSelectionTimeoutMS: 25000, // Increase timeout to 25 seconds
      });
    } catch (error) {
      console.error(`An Error occured ----> ${error.message}`);
      throw new Error(
        "Error while establishing connection with the mongoDB server"
      );
    }
  }

  static async isConnected(){
    const status = await mongoose.connection.readyState;
    return status===1;
  }
}
