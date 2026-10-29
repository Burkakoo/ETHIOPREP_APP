import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { verifyEmailTransport } from "./config/email.js";

let server;

async function start(retries = 3) {
  try {
    await connectDatabase();
    await verifyEmailTransport();
    server = app.listen(env.port, () => {
      console.info(`EthioPrep API listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    if (retries > 0) {
      console.warn(`Connection to MongoDB Atlas failed, retrying in 3 seconds... (${retries} retries left)`);
      setTimeout(() => start(retries - 1), 3000);
    } else {
      console.error("Failed to start EthioPrep API:", error);
      process.exit(1);
    }
  }
}

async function shutdown(signal) {
  console.info(`${signal} received. Shutting down.`);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
