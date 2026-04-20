import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";

export const syncUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("super_admin"),
      v.literal("field_worker"),
      v.literal("volunteer")
    ),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called syncUser without authentication");
    }

    const clerkId = identity.subject;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    let userId;
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        role: args.role,
        imageUrl: args.imageUrl,
      });
      userId = existingUser._id;
    } else {
      userId = await ctx.db.insert("users", {
        clerkId,
        name: args.name,
        email: args.email,
        role: args.role,
        imageUrl: args.imageUrl,
      });
    }

    // Auto-create volunteer record for roster visibility
    if (args.role === "volunteer") {
      const existingVolunteer = await ctx.db
        .query("volunteers")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      
      if (!existingVolunteer) {
        await ctx.db.insert("volunteers", {
          userId,
          isAvailable: true,
          skills: [],
          currentLocation: { lat: 0, lng: 0 }
        });
      }
    }

    return userId;
  },
});

export const updateUserProfile = mutation({
  args: {
    phoneNumber: v.optional(v.string()),
    permanentAddress: v.optional(v.string()),
    temporaryAddress: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    await ctx.db.patch(user._id, {
      ...args,
    });
  },
});

/**
 * Upload profile image: accepts a Convex storageId, resolves it
 * to a real serving URL, then persists it into the users table.
 */
export const updateProfileImage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Resolve storageId → actual HTTP URL
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new Error("Failed to resolve storage URL");

    await ctx.db.patch(user._id, { imageUrl });

    return imageUrl;
  },
});

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return null;

    let solvedImageUrl = user.imageUrl;
    if (solvedImageUrl && !solvedImageUrl.startsWith("http")) {
      const url = await ctx.storage.getUrl(solvedImageUrl);
      if (url) solvedImageUrl = url;
    }

    return {
      ...user,
      imageUrl: solvedImageUrl,
    };
  },
});

export const listVolunteers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "volunteer"))
      .collect();
  },
});

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) return null;

    let solvedImageUrl = user.imageUrl;
    if (solvedImageUrl && !solvedImageUrl.startsWith("http")) {
      const url = await ctx.storage.getUrl(solvedImageUrl);
      if (url) solvedImageUrl = url;
    }

    return {
      ...user,
      imageUrl: solvedImageUrl,
    };
  },
});

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export const getVolunteerStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const assignedReports = await ctx.db
      .query("reports")
      .withIndex("by_assignedVolunteerId", (q) => q.eq("assignedVolunteerId", args.userId))
      .collect();

    const completed = assignedReports.filter(r => r.status === "resolved").length;
    const active = assignedReports.length - completed;

    return {
      totalAssigned: assignedReports.length,
      completed,
      active,
    };
  },
});
