import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Super-admin-only: fully delete a volunteer.
 * Removes the volunteer record, the user account, unassigns related reports,
 * and cleans up notifications addressed to that user.
 */
export const deleteVolunteer = mutation({
  args: {
    volunteerId: v.id("volunteers"), // volunteers table row id
  },
  handler: async (ctx, args) => {
    const caller = await getCurrentUser(ctx);
    if (!caller || caller.role !== "super_admin") {
      throw new Error("Only super admins can delete volunteers.");
    }

    const volunteerRecord = await ctx.db.get(args.volunteerId);
    if (!volunteerRecord) throw new Error("Volunteer record not found.");

    const userId = volunteerRecord.userId;

    // 1. Unassign any reports currently assigned to this volunteer
    const assignedReports = await ctx.db
      .query("reports")
      .withIndex("by_assignedVolunteerId", (q) => q.eq("assignedVolunteerId", userId))
      .take(200);
    for (const report of assignedReports) {
      await ctx.db.patch(report._id, { assignedVolunteerId: undefined, status: "open" });
    }

    // 2. Delete notifications sent to this volunteer's user account
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(200);
    for (const notif of notifications) {
      await ctx.db.delete(notif._id);
    }

    // 3. Delete the volunteer record
    await ctx.db.delete(args.volunteerId);

    // 4. Delete the user account itself
    await ctx.db.delete(userId);
  },
});

/**
 * Get all volunteers, optionally filtering by availability.
 */
export const getVolunteers = query({
  args: {
    onlyAvailable: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let volunteersQuery;
    if (args.onlyAvailable) {
      volunteersQuery = ctx.db
        .query("volunteers")
        .withIndex("by_availability", (q) => q.eq("isAvailable", true));
    } else {
      volunteersQuery = ctx.db.query("volunteers");
    }

    const volunteerRecords = await volunteersQuery.collect();
    
    // Join with users table and apply search filter
    const joinedVolunteers = await Promise.all(
      volunteerRecords.map(async (vRecord) => {
        const u = await ctx.db.get(vRecord.userId);
        let solvedImageUrl = u?.imageUrl;
        if (solvedImageUrl && !solvedImageUrl.startsWith("http")) {
          const url = await ctx.storage.getUrl(solvedImageUrl);
          if (url) solvedImageUrl = url;
        }

        return {
          ...vRecord,
          name: u?.name || "Anonymous",
          email: u?.email || "",
          imageUrl: solvedImageUrl,
        };
      })
    );

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      return joinedVolunteers.filter(v => 
        v.name.toLowerCase().includes(searchLower) || 
        v.email.toLowerCase().includes(searchLower)
      );
    }

    return joinedVolunteers;
  },
});

export const getVolunteerByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("volunteers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

/**
 * Toggle availability of the authenticated volunteer.
 */
export const updateAvailability = mutation({
  args: {
    isAvailable: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "volunteer") {
      throw new Error("Only volunteers can update their availability");
    }

    const volunteerRecord = await ctx.db
      .query("volunteers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (volunteerRecord) {
      await ctx.db.patch(volunteerRecord._id, {
        isAvailable: args.isAvailable,
      });
    } else {
      // Create record if it doesn't exist
      await ctx.db.insert("volunteers", {
        userId: user._id,
        isAvailable: args.isAvailable,
        skills: [],
        currentLocation: { lat: 0, lng: 0 },
      });
    }
  },
});

/**
 * Update current location and skills for a volunteer.
 */
export const updateVolunteerProfile = mutation({
  args: {
    skills: v.optional(v.array(v.string())),
    currentLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "volunteer") {
      throw new Error("Only volunteers can update their profile");
    }

    const volunteerRecord = await ctx.db
      .query("volunteers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (volunteerRecord) {
      await ctx.db.patch(volunteerRecord._id, {
        ...(args.skills && { skills: args.skills }),
        ...(args.currentLocation && { currentLocation: args.currentLocation }),
      });
    } else {
      await ctx.db.insert("volunteers", {
        userId: user._id,
        skills: args.skills ?? [],
        isAvailable: true,
        currentLocation: args.currentLocation ?? { lat: 0, lng: 0 },
      });
    }
  },
});

/**
 * Find the 5 nearest volunteers to a specific location.
 * Used by admins for smart task assignment.
 */
export const getNearestVolunteers = query({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const volunteers = await ctx.db
      .query("volunteers")
      .withIndex("by_availability", (q) => q.eq("isAvailable", true))
      .collect();

    // Join with user data and calculate distance
    const results = await Promise.all(
      volunteers.map(async (vRecord) => {
        const u = await ctx.db.get(vRecord.userId);
        
        // Simple Haversine approximation (straight-line distance)
        const distance = Math.sqrt(
          Math.pow(vRecord.currentLocation.lat - args.lat, 2) + 
          Math.pow(vRecord.currentLocation.lng - args.lng, 2)
        );

        let solvedImageUrl = u?.imageUrl;
        if (solvedImageUrl && !solvedImageUrl.startsWith("http")) {
          const url = await ctx.storage.getUrl(solvedImageUrl);
          if (url) solvedImageUrl = url;
        }

        return {
          ...vRecord,
          name: u?.name || "Anonymous",
          imageUrl: solvedImageUrl,
          distance,
        };
      })
    );

    // Sort by distance and take top 5
    return results.sort((a, b) => a.distance - b.distance).slice(0, 5);
  },
});
