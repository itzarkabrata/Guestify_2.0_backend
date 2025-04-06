import { AMQP } from "./lib/amqp.connect.js";

async function func(params) {
    await AMQP.establishConn("abcde");
    await AMQP.consumeMsg("abcde");
    console.log("consumed");
}

func();