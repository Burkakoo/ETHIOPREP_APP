import mongoose from "mongoose";
import { env } from "./env.js";

// On Windows systems / local networks, Node's internal c-ares resolver often times out or fails (querySrv ETIMEOUT / ECONNREFUSED)
// when resolving Atlas SRV records over UDP. Converting mongodb+srv to the direct replica-set host list routes
// lookups through the OS's native getaddrinfo, ensuring instant and 100% reliable connections.
function getEffectiveUri(uri) {
  if (uri && uri.startsWith("mongodb+srv://") && uri.includes("cluster1.t7t6gsx.mongodb.net")) {
    try {
      const url = new URL(uri);
      const auth = url.username
        ? encodeURIComponent(decodeURIComponent(url.username)) +
          ":" +
          encodeURIComponent(decodeURIComponent(url.password)) +
          "@"
        : "";
      const pathAndQuery = url.pathname + url.search + (url.search ? "&" : "?") + "ssl=true&replicaSet=atlas-a265l1-shard-0&authSource=admin";
      return (
        "mongodb://" +
        auth +
        "ac-xbrhs0f-shard-00-00.t7t6gsx.mongodb.net:27017," +
        "ac-xbrhs0f-shard-00-01.t7t6gsx.mongodb.net:27017," +
        "ac-xbrhs0f-shard-00-02.t7t6gsx.mongodb.net:27017" +
        pathAndQuery
      );
    } catch {
      return uri;
    }
  }
  return uri;
}

export async function connectDatabase() {
  mongoose.connection.on("connected", () => {
    console.info("MongoDB Atlas connected.");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB Atlas connection error:", error);
  });

  const uriToUse = getEffectiveUri(env.mongodbUri);

  await mongoose.connect(uriToUse, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
