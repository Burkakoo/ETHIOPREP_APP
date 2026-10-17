import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env")
});

const required = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  nodeEnv: required("NODE_ENV", "development"),
  port: Number(required("PORT", "5000")),
  mongodbUri: required("MONGODB_URI"),
  clientOrigin: required("CLIENT_ORIGIN", "http://localhost:5173"),
  clientOrigins: process.env.CLIENT_ORIGINS ? process.env.CLIENT_ORIGINS.split(",").map(o => o.trim()) : [required("CLIENT_ORIGIN", "http://localhost:5173")],
  bcryptSaltRounds: Number(required("BCRYPT_SALT_ROUNDS", "12")),
  jwtSecret: required("JWT_SECRET", "ethioprep-dev-secret")
};

if (!["mongodb+srv://", "mongodb://"].some((scheme) => env.mongodbUri.startsWith(scheme))) {
  throw new Error("MONGODB_URI must be a MongoDB Atlas connection string.");
}

if (/[<>]|<cluster>|<username>|<password>/.test(env.mongodbUri)) {
  throw new Error(
    "MONGODB_URI still contains an Atlas placeholder. Replace <username>, <password>, and <cluster> with values from MongoDB Atlas."
  );
}

if (env.mongodbUri.includes("@cluster0.mongodb.net")) {
  throw new Error(
    "MONGODB_URI has an incomplete Atlas hostname. Copy the full driver connection string from MongoDB Atlas, including the unique cluster suffix after cluster0."
  );
}

if (env.nodeEnv === "production" && env.jwtSecret === "ethioprep-dev-secret") {
  throw new Error("JWT_SECRET must be changed before running in production.");
}

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

if (!Number.isInteger(env.bcryptSaltRounds) || env.bcryptSaltRounds < 10) {
  throw new Error("BCRYPT_SALT_ROUNDS must be an integer of at least 10.");
}

// MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ethioprep?retryWrites=true&w=majority
