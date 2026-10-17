import { User } from "../models/User.js";

export async function listUsers(request, response) {
  try {
    const filter = {};
    if (request.query.role) filter.role = request.query.role;
    if (request.query.stream) filter.stream = request.query.stream;
    if (request.query.search) {
      const q = String(request.query.search).trim();
      filter.$or = [
        { displayName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .limit(200);

    return response.json({ users });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to fetch users." });
  }
}

export async function updateUserRole(request, response) {
  try {
    const { id } = request.params;
    const { role } = request.body;

    if (!["student", "content_manager", "cash_manager", "admin"].includes(role)) {
      return response.status(400).json({ error: "Invalid role specified." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }

    return response.json({ user });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to update user role." });
  }
}

export async function updateUserStatus(request, response) {
  try {
    const { id } = request.params;
    const { status, isPremium } = request.body;

    const updates = {};
    if (status && ["active", "suspended", "deleted"].includes(status)) {
      updates.status = status;
    }
    if (typeof isPremium === "boolean") {
      updates.isPremium = isPremium;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).select("-passwordHash");

    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }

    return response.json({ user });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Failed to update user status." });
  }
}
