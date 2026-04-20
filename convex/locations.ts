import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Legacy support for updating location. 
 * Now updates the 'volunteers' table.
 */
export const updateLocation = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "volunteer") {
      throw new Error("Only volunteers can update their location");
    }

    const existing = await ctx.db
      .query("volunteers")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        currentLocation: { lat: args.lat, lng: args.lng },
      });
    } else {
      await ctx.db.insert("volunteers", {
        userId: user._id,
        currentLocation: { lat: args.lat, lng: args.lng },
        isAvailable: true,
        skills: [],
      });
    }
  },
});

/**
 * Legacy support for getting volunteer locations.
 * Fetches from the 'volunteers' table and flattens for the UI.
 */
export const getVolunteerLocations = query({
  args: {},
  handler: async (ctx) => {
    const volunteers = await ctx.db
      .query("volunteers")
      .withIndex("by_availability", (q) => q.eq("isAvailable", true))
      .collect();
      
    const locations = await Promise.all(
      volunteers.map(async (v) => {
        // Filter out uninitialized locations
        if (v.currentLocation.lat === 0 && v.currentLocation.lng === 0) return null;
        
        const u = await ctx.db.get(v.userId);
        return {
          _id: v._id,
          userId: v.userId,
          name: u?.name || "Unknown Agent",
          email: u?.email || "",
          imageUrl: u?.imageUrl,
          lat: v.currentLocation.lat,
          lng: v.currentLocation.lng,
          address: u?.temporaryAddress || "No active ops base",
          updatedAt: v._creationTime,
        };
      })
    );
    
    return locations.filter((loc): loc is NonNullable<typeof loc> => loc !== null);
  },
});
