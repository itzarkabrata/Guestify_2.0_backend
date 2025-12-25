import { Database } from "../lib/connect.js";
import { CRON_MAP } from "./map.js";

export class CronManager {
  static async startAll() {
    try {
      const connected = await Database.isConnected();
      if (!connected)
        throw new Error("DB not connected. Cannot start cron jobs.");

      Object.entries(CRON_MAP).forEach(([name, job]) => {
        job.start();
      });

      console.log("All cron jobs started successfully.");
    } catch (error) {
      console.error(error.message);
    }
  }

  static async stopAll() {
    try {
      const connected = await Database.isConnected();
      if (!connected)
        throw new Error("DB not connected. Cannot stop cron jobs.");

      Object.entries(CRON_MAP).forEach(([name, job]) => {
        job.stop();
      });

      console.log("All cron jobs stopped successfully.");
    } catch (error) {
      console.error(error.message);
    }
  }

  static async start(name) {
    try {
      const connected = await Database.isConnected();
      if (!connected) throw new Error("DB not connected. Cannot start cron.");

      if (!CRON_MAP[name]) {
        throw new Error(`Cron job '${name}' not found.`);
      }

      CRON_MAP[name].start();
      console.log(`Cron started: ${name}`);
    } catch (error) {
      console.error(error.message);
    }
  }

  static async stop(name) {
    try {
      const connected = await Database.isConnected();
      if (!connected) throw new Error("DB not connected. Cannot stop cron.");

      if (!CRON_MAP[name]) {
        throw new Error(`Cron job '${name}' not found.`);
      }

      CRON_MAP[name].stop();
      console.log(`Cron stopped: ${name}`);
    } catch (error) {
      console.error(error.message);
    }
  }

  static list() {
    return Object.keys(CRON_MAP);
  }
}
