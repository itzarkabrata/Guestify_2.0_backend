import { AMQP } from "./lib/amqp.connect.js";

async function func(params) {
    await AMQP.establishConn("abcde");
    await AMQP.publishMsg("abcde","Hello new message 2");
    console.log("sent");
}

func();