export class EventObj{
    static createEventObj(notification_type,message,isRead,category,recipient=null,device_token=null) {
        try {
            return {
                recipient : recipient,
                device_token : device_token,
                notification_type : notification_type,
                category : category,
                message : message,
                isRead : isRead,
                date_of_noti : new Date().toLocaleString().toString()
            }
        } catch (error) {
            console.log(error.message);
        }
    }
}