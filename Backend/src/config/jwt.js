import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const JWT_SECRET = env.jwtSecret;

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
