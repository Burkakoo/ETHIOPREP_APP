import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { verifyEmailTransport } from "./config/email.js";

let server;

async function start() {
  server = app.listen(env.port, "0.0.0.0", () => {
    console.info(`EthioPrep API & Web listening on http://0.0.0.0:${env.port}`);
  });
  await connectDatabase();
  if (env.emailUser && env.emailPassword) {
    verifyEmailTransport().catch(() => {});
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
