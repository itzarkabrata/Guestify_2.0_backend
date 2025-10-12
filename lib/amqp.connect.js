import amqp from "amqplib";
import { Notification } from "../controller/notification_class.js";
import { NewNotification } from "../controller/notification_class_new.js";
import { Nodemailer } from "./email/email.config.js";
import { Wishlist_Model } from "../models/wishlist.js";
import { PgInfo_Model } from "../models/pginfo.js";

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

  static async publishEmail(queue, message) {
    try {
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.sendToQueue(queue, Buffer.from(message));
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while publishing message to the AMQP server");
    }
  }

  static async publishWishlistItem(queue, message) {
    try {
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.sendToQueue(queue, Buffer.from(message));
    } catch (error) {
      console.error(`An Error occurred ----> ${error.message}`);
      throw new Error("Error while publishing message to the AMQP server");
    }
  }

  static async publishWishlistItem_DLQ(queue, message) {
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

  static async consumeWishlistItem(queue) {
    try {
      console.log("Primary Wishlist Queue service started");
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            const { userid, pg_id, type } = JSON.parse(message.content);

            const pg = await PgInfo_Model.findOne({ _id: pg_id });
            if (!pg) {
              throw new EvalError(
                "Paying Guest not found in the Paying Guest List"
              );
            }

            if(type !== "create" && type !== "delete"){
              throw new TypeError("Type must be either create or delete");
            }

            if(type === "delete"){
              await Wishlist_Model.deleteOne({ user_id: userid, pg_id: pg_id });
            }

            if(type === "create"){
              const wishlistItem = new Wishlist_Model({ user_id: userid, pg_id: pg_id});
              await wishlistItem.save();
            }
            
            //Acknowledging the message
            AMQP.channel.ack(message);

          } catch (error) {
            console.log(error.message);

            //publishing the message to DLQ
            AMQP.publishWishlistItem_DLQ("delete-wishlist-queue",message.content);

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

  static async consumeWishlistItem_DLQ(queue) {
    try {
      console.log("Delete Wishlist Queue service started");
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            const { userid, pg_id, type } = JSON.parse(message.content);

            const pg = await PgInfo_Model.findOne({ _id: pg_id });
            if (!pg) {
              throw new EvalError(
                "Paying Guest not found in the Paying Guest List"
              );
            }

            if(type !== "create" && type !== "delete"){
              throw new TypeError("Type must be either create or delete");
            }

            if(type === "delete"){
              await Wishlist_Model.deleteOne({ user_id: userid, pg_id: pg_id });
            }

            if(type === "create"){
              const wishlistItem = new Wishlist_Model({ user_id: userid, pg_id: pg_id});
              await wishlistItem.save();
            }

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

  static async consumeEmail(queue) {
    try {
      console.log("Primary Mail Queue service started");
      //check whether the queue is already there
      await AMQP.createNewQueue(queue);

      AMQP.channel.consume(queue, async (message) => {
        if (message !== null) {
          try {
            //This is for in APP Email Service
            await Nodemailer.sendMail(...Object.values(JSON.parse(message.content)));

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

}
