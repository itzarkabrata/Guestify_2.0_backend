export class EventObj {
  static createEventObj(
    notification_type,
    message,
    isRead,
    category,
    recipient = null,
    device_token = null
  ) {
    try {
      return {
        recipient: recipient,
        device_token: device_token,
        notification_type: notification_type,
        category: category,
        message: message,
        isRead: isRead,
        date_of_noti: new Date().toLocaleString().toString(),
      };
    } catch (error) {
      console.log(error.message);
    }
  }

  static createMailEventObj(
    recepient_email,
    subject,
    type,
    data,
    successMessage = "Mail Send Successfully",
    failureMessage = "Mail not send"
  ) {
    try {
      return {
        recepient_email: recepient_email,
        subject: subject,
        type: type,
        data: data,
        successMessage: successMessage,
        failureMessage: failureMessage,
      };
    } catch (error) {
      console.log(error.message);
    }
  }

  static createWishlistEventObj(userid, pg_id, type) {
    try {
      return {
        userid: userid,
        pg_id: pg_id,
        type: type
      };
    } catch (error) {
      console.log(error.message);
    }
  }
}
