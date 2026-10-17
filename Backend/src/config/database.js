import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.connection.on("connected", () => {
    console.info("MongoDB Atlas connected.");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB Atlas connection error:", error);
  });

  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
