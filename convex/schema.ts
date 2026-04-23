import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Project Nexus Database Schema
 * Supports real-time NGO coordination, map-based reporting, and role-based access control.
 */
export default defineSchema({
  /**
   * users Table: Identity Management
   * Stores profile mapping between Clerk auth and internal database refs.
   */
  users: defineTable({
    clerkId: v.string(), // Unique identity from Clerk
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("field_worker"), v.literal("volunteer")),
    imageUrl: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    permanentAddress: v.optional(v.string()),
    temporaryAddress: v.optional(v.string()),
    isVerified: v.optional(v.boolean()),
    idBadge: v.optional(v.id("_storage")), // Identity verification document
    lastSeen: v.optional(v.number()), // Timestamp for activity tracking
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_role", ["role"]),

  /**
   * reports Table: Core Entity
   * Stores humanitarian incidents and their status in the field.
   */
  reports: defineTable({
    title: v.optional(v.string()), // Optional: Maintain compatibility with frontend
    description: v.string(),
    aiSummary: v.optional(v.string()), // Analysis by AI synthesis
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("assigned"),
      v.literal("pending"),
      v.literal("rejected"),
      v.literal("resolved")
    ),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
    }),
    workerId: v.id("users"), // Personnel who created the report
    assignedVolunteerId: v.optional(v.id("users")), // Volunteer handling the case
    reportPhoto: v.optional(v.id("_storage")), // Initial photo of the incident
    resolutionPhoto: v.optional(v.id("_storage")), // Photo evidence of resolution
    resolutionNotes: v.optional(v.string()),
    resolutionVerificationStatus: v.optional(v.union(v.literal("accepted"), v.literal("rejected"), v.literal("pending"))),
    verificationStatus: v.optional(v.union(v.literal("accepted"), v.literal("rejected"), v.literal("pending"))),
    helpStatus: v.optional(v.union(v.literal("none"), v.literal("requested"), v.literal("provided"))),
    helpRequest: v.optional(v.string()),
    helpResponse: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    assignedAt: v.optional(v.number()),
    resolutionSubmittedAt: v.optional(v.number()),
    resolutionVerifiedAt: v.optional(v.number()),
    helpRequestedAt: v.optional(v.number()),
    helpProvidedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_workerId", ["workerId"])
    .index("by_assignedVolunteerId", ["assignedVolunteerId"])
    .index("by_category", ["category"]),

  categories: defineTable({
    name: v.string(), // e.g., "Water Scarcity", "Medical Emergency"
    icon: v.string(), // Lucide icon name
    description: v.optional(v.string()),
  }),

  /**
   * volunteers Table: Operational Tracking
   * Tracks availability and skillsets of registered personnel.
   */
  volunteers: defineTable({
    userId: v.id("users"),
    isAvailable: v.boolean(),
    skills: v.array(v.string()),
    currentLocation: v.object({
      lat: v.number(),
      lng: v.number(),
    }),
  })
    .index("by_userId", ["userId"])
    .index("by_availability", ["isAvailable"]),

  /**
   * notifications Table: Persistence for alerts
   */
  notifications: defineTable({
    userId: v.id("users"), // Recipient (Super Admin)
    title: v.string(),
    message: v.string(),
    reportId: v.optional(v.id("reports")),
    type: v.union(
      v.literal("new_report"), 
      v.literal("report_resolved"), 
      v.literal("report_accepted"), 
      v.literal("report_rejected")
    ),
    isRead: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_read", ["isRead"]),
});
