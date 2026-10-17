import { signToken } from "../config/jwt.js";
import { User } from "../models/User.js";

export async function registerUser(request, response) {
  try {
    const { email, password, displayName, phoneNumber, stream = "natural" } = request.body;

    if (!email || !password || !displayName) {
      return response.status(400).json({ error: "Email, password, and displayName are required." });
    }

    if (String(password).length < 8) {
      return response.status(400).json({ error: "Password must be at least 8 characters long." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return response.status(409).json({ error: "User already exists with this email." });
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

    const token = signToken({ userId: user._id, role: user.role });

    return response.status(201).json({
      message: "User registered successfully.",
      token,
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
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Registration failed." });
  }
}

export async function loginUser(request, response) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select("+passwordHash");

    if (!user) {
      return response.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return response.status(401).json({ error: "Invalid email or password." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken({ userId: user._id, role: user.role });

    return response.json({
      message: "Login successful.",
      token,
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
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Login failed." });
  }
}

export async function updateStream(request, response) {
  try {
    const { stream } = request.body;
    if (!["natural", "social"].includes(stream)) {
      return response.status(400).json({ error: "Stream must be 'natural' or 'social'." });
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
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to update stream." });
  }
}

export async function me(request, response) {
  return response.json({ user: request.user });
}

export async function getProfile(request, response) {
  try {
    const user = await User.findById(request.user._id).select("-passwordHash");
    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }
    return response.json({ user });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch profile." });
  }
}

export async function updateProfile(request, response) {
  try {
    const { displayName, phoneNumber, email, telegramLink, qa, notifications } = request.body;

    const updates = {};
    if (displayName) updates.displayName = displayName;
    if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
    if (email) updates.email = email.trim().toLowerCase();
    // telegramLink and qa are admin-managed fields - students can only view them
    if (telegramLink !== undefined) updates["profile.telegramLink"] = telegramLink;
    if (qa !== undefined) updates["profile.qa"] = qa;
    if (typeof notifications === "boolean") updates.notifications = notifications;

    const user = await User.findByIdAndUpdate(
      request.user._id,
      { $set: updates },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }

    return response.json({
      message: "Profile updated successfully.",
      user
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return response.status(409).json({ error: "Email or phone number already in use." });
    }
    return response.status(500).json({ error: "Failed to update profile." });
  }
}

export async function updatePassword(request, response) {
  try {
    const { currentPassword, newPassword } = request.body;

    if (!currentPassword || !newPassword) {
      return response.status(400).json({ error: "Current password and new password are required." });
    }

    if (String(newPassword).length < 8) {
      return response.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    const user = await User.findById(request.user._id).select("+passwordHash");

    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return response.status(401).json({ error: "Current password is incorrect." });
    }

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    return response.json({
      message: "Password updated successfully."
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to update password." });
  }
}

