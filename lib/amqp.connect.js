import amqp from "amqplib";
import { Notification } from "../controller/notification_class.js";
import { NewNotification } from "../controller/notification_class_new.js";

export class AMQP {
  static channel = null;

  static async establishConn() {
    try {
      const conn = await amqp.connect(process.env.AMQP_SERV_URL);
      const ch1 = await conn.createChannel();

      //assigning the channel as a class attribute
      AMQP.channel = ch1;

      console.log("AMQP server connected successfully");
    } catch (error) {
      console.error(`An Error occurred ----> ${error}`);
      throw new Error("Error while establishing connection with the AMQP server");
    }
  }

  static async createNewQueue(queue){
    try {
      await AMQP.channel.assertQueue(queue);
    } catch (error) {
      console.error(`An Error occurred ----> ${error}`);
      throw new Error("Error while asserting a new queue in the AMQP server");
    }
  }

  static async publishMsg_DLQ(queue, message) {
    try {
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.sendToQueue(queue, Buffer.from(message));
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while publishing message to the AMQP server");
    }
  }

  static async consumeMsg_DLQ(queue) {
    try {
      console.log("Delete-Queue service started");
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            //This is for in APP notification
            await NewNotification.createNotification(JSON.parse(message.content));

            //Acknowledging the message
            AMQP.channel.ack(message);

          } catch (error) {
            console.log(error.message);

            //Acknowledging the message from the delete queue
            AMQP.channel.ack(message);
          }
        }
      });
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while consuming message from the AMQP server");
    }
  }

  static async publishMsg(queue, message) {
    try {
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.sendToQueue(queue, Buffer.from(message));
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while publishing message to the AMQP server");
    }
  }

  static async consumeMsg(queue) {
    try {
      console.log("Primary-Queue service started");
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            //This is for in APP notification
            await NewNotification.createNotification(JSON.parse(message.content));

            //Acknowledging the message
            AMQP.channel.ack(message);

          } catch (error) {
            console.log(error.message);

            //publishing the message to DLQ
            AMQP.publishMsg_DLQ("delete-noti-queue",message.content);

            //Acknowledging the message from the primary queue
            AMQP.channel.ack(message);
          }
        }
      });
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while consuming message from the AMQP server");
    }
  }


}
