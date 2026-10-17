import { signToken, signRefreshToken, verifyToken } from "../config/jwt.js";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { ValidationError, ConflictError, NotFoundError, AuthenticationError, asyncHandler } from "../middleware/errorHandler.middleware.js";

export const registerUser = asyncHandler(async (request, response) => {
  const { email, password, displayName, phoneNumber, stream = "natural" } = request.body;

  if (!email || !password || !displayName) {
    throw new ValidationError("Email, password, and displayName are required.");
  }

  if (String(password).length < 8) {
    throw new ValidationError("Password must be at least 8 characters long.");
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ConflictError("User already exists with this email.");
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({
    email: normalizedEmail,
    displayName,
    phoneNumber,
    passwordHash,
    role: "student",
    stream: ["natural", "social"].includes(stream) ? stream : "natural",
    status: "active"
  });

  const accessToken = signToken({ userId: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt,
    deviceId: request.headers["user-agent"]
  });

  return response.status(201).json({
    message: "User registered successfully.",
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      stream: user.stream,
      isPremium: Boolean(user.isPremium),
      status: user.status
    }
  });
});

export const loginUser = asyncHandler(async (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    throw new ValidationError("Email and password are required.");
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+passwordHash");

  if (!user) {
    throw new AuthenticationError("Invalid email or password.");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AuthenticationError("Invalid email or password.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  const accessToken = signToken({ userId: user._id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt,
    deviceId: request.headers["user-agent"]
  });

  return response.json({
    message: "Login successful.",
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      stream: user.stream || "natural",
      isPremium: Boolean(user.isPremium),
      status: user.status
    }
  });
});

export const updateStream = asyncHandler(async (request, response) => {
  const { stream } = request.body;
  if (!["natural", "social"].includes(stream)) {
    throw new ValidationError("Stream must be 'natural' or 'social'.");
  }

  const user = await User.findByIdAndUpdate(
    request.user._id,
    { $set: { stream } },
    { new: true }
  );

  return response.json({
    message: `Stream updated to ${stream === "natural" ? "Natural Science" : "Social Science"}.`,
    user: {
      id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      stream: user.stream,
      status: user.status
    }
  });
});

export function me(request, response) {
  return response.json({ user: request.user });
}

export const getProfile = asyncHandler(async (request, response) => {
  const user = await User.findById(request.user._id).select("-passwordHash");
  if (!user) {
    throw new NotFoundError("User not found.");
  }
  return response.json({ user });
});

export const updateProfile = asyncHandler(async (request, response) => {
  const { displayName, phoneNumber, email, telegramLink, qa, notifications } = request.body;

  const updates = {};
  if (displayName) updates.displayName = displayName;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
  if (email) updates.email = email.trim().toLowerCase();
  if (telegramLink !== undefined) updates["profile.telegramLink"] = telegramLink;
  if (qa !== undefined) updates["profile.qa"] = qa;
  if (typeof notifications === "boolean") updates.notifications = notifications;

  const user = await User.findByIdAndUpdate(
    request.user._id,
    { $set: updates },
    { new: true }
  ).select("-passwordHash");

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return response.json({
    message: "Profile updated successfully.",
    user
  });
});

export const updatePassword = asyncHandler(async (request, response) => {
  const { currentPassword, newPassword } = request.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError("Current password and new password are required.");
  }

  if (String(newPassword).length < 8) {
    throw new ValidationError("New password must be at least 8 characters long.");
  }

  const user = await User.findById(request.user._id).select("+passwordHash");

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw new AuthenticationError("Current password is incorrect.");
  }

  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();

  return response.json({
    message: "Password updated successfully."
  });
});

export const refreshToken = asyncHandler(async (request, response) => {
  const { refreshToken: token } = request.body;

  if (!token) {
    throw new ValidationError("Refresh token is required.");
  }

  const decoded = verifyToken(token);
  const refreshTokenDoc = await RefreshToken.findOne({
    token,
    userId: decoded.userId,
    revoked: false,
    expiresAt: { $gt: new Date() }
  });

  if (!refreshTokenDoc) {
    throw new AuthenticationError("Invalid or expired refresh token.");
  }

  const user = await User.findById(decoded.userId);

  if (!user || user.status !== "active") {
    throw new AuthenticationError("Invalid or inactive user.");
  }

  const newAccessToken = signToken({ userId: user._id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user._id });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  refreshTokenDoc.revoked = true;
  refreshTokenDoc.revokedAt = new Date();
  refreshTokenDoc.replacedByToken = newRefreshToken;
  await refreshTokenDoc.save();

  await RefreshToken.create({
    userId: user._id,
    token: newRefreshToken,
    expiresAt,
    deviceId: request.headers["user-agent"]
  });

  return response.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  });
});

export const logout = asyncHandler(async (request, response) => {
  const { refreshToken: token } = request.body;

  if (token) {
    await RefreshToken.updateOne(
      { token, userId: request.user._id },
      { revoked: true, revokedAt: new Date() }
    );
  }

  return response.json({
    message: "Logged out successfully."
  });
});

