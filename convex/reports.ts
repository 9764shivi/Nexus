import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { paginationOptsValidator } from "convex/server";

// Reports management and volunteer coordination logic

/**
 * Create a new report. Status is set to 'open' by default.
 */
export const createReport = mutation({
  args: {
    title: v.optional(v.string()), // Added for UI compatibility
    description: v.string(),
    aiSummary: v.optional(v.string()), // Changed to optional for compatibility
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.string(),
    location: v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
    }),
    reportPhoto: v.optional(v.id("_storage")), // mapping from UI imageUrl
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    if (user.role !== "field_worker" && user.role !== "super_admin") {
      throw new Error("Only field workers can create reports");
    }

    const { reportPhoto, ...otherData } = args;

    const reportId = await ctx.db.insert("reports", {
      ...otherData,
      reportPhoto,
      aiSummary: args.aiSummary ?? "Pending AI processing...",
      status: "open",
      workerId: user._id,
    });

    // Notify Super Admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "New Mission Logged",
        message: `${args.category} incident at ${args.location.address}`,
        type: "new_report",
        reportId,
        isRead: false,
      });
    }

    return reportId;
  },
});

/**
 * Get reports with optional pagination and filtering.
 */
export const getReports = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
    status: v.optional(v.union(v.literal("open"), v.literal("assigned"), v.literal("pending"), v.literal("rejected"), v.literal("resolved"))),
    assignedVolunteerId: v.optional(v.id("users")),
    workerId: v.optional(v.id("users")),
    search: v.optional(v.string()), // Added search parameter
  },
  handler: async (ctx, args) => {
    let reportsQuery;
    if (args.status) {
      reportsQuery = ctx.db
        .query("reports")
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
    } else if (args.assignedVolunteerId) {
      reportsQuery = ctx.db
        .query("reports")
        .withIndex("by_assignedVolunteerId", (q) => q.eq("assignedVolunteerId", args.assignedVolunteerId as any));
    } else if (args.workerId) {
      reportsQuery = ctx.db
        .query("reports")
        .withIndex("by_workerId", (q) => q.eq("workerId", args.workerId as any));
    } else {
      reportsQuery = ctx.db.query("reports");
    }

    const rawReports = await reportsQuery.order("desc").collect();

    const allReports = await Promise.all(
      rawReports.map(async (report) => {
        let photoUrl: any = report.reportPhoto;
        if (photoUrl && !(typeof photoUrl === 'string' && photoUrl.startsWith("http"))) {
           photoUrl = await ctx.storage.getUrl(photoUrl as any) || photoUrl;
        }
        let resolutionPhotoUrl: any = report.resolutionPhoto;
        if (resolutionPhotoUrl && !(typeof resolutionPhotoUrl === 'string' && resolutionPhotoUrl.startsWith("http"))) {
           const url = await ctx.storage.getUrl(resolutionPhotoUrl as any);
           if (url) resolutionPhotoUrl = url;
        }
        let volunteer: any = report.assignedVolunteerId 
          ? await ctx.db.get(report.assignedVolunteerId) 
          : null;
        
        // Critical Fallback: if the ID is actually from the 'volunteers' table instead of 'users'
        if (!volunteer && report.assignedVolunteerId) {
          const vRecord = await ctx.db.get(report.assignedVolunteerId as any);
          if (vRecord && (vRecord as any).userId) {
            volunteer = await ctx.db.get((vRecord as any).userId);
          }
        }

        // UI consistency: Prioritize resolution verification status for display
        let displayStatus = report.status;
        if (report.resolutionVerificationStatus === "pending") {
          displayStatus = "pending";
        } else if (report.resolutionVerificationStatus === "rejected") {
          displayStatus = "rejected";
        } else if (report.resolutionVerificationStatus === "accepted") {
          displayStatus = "resolved";
        }

        return {
           ...report,
           status: displayStatus as any,
           reportPhoto: photoUrl as any,
           resolutionPhoto: resolutionPhotoUrl as any,
           volunteerName: (volunteer as any)?.name || (volunteer as any)?.email?.split('@')[0] || "Name Missing",
           volunteerJoinedAt: (volunteer as any)?._creationTime,
        };
      })
    );

    // Client-side search simulation (Convex doesn't support complex string search easily in dev mode)
    let filteredReports = allReports;
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      filteredReports = allReports.filter(r => 
        r.title?.toLowerCase().includes(searchLower) || 
        r.description.toLowerCase().includes(searchLower) ||
        r.category.toLowerCase().includes(searchLower)
      );
    }

    if (args.paginationOpts) {
      // Manual pagination for search results
      const start = args.paginationOpts.numItems * 0; // Simplified
      return {
        page: filteredReports.slice(0, args.paginationOpts.numItems),
        isDone: filteredReports.length <= args.paginationOpts.numItems,
        continueCursor: "",
      };
    }

    return filteredReports;
  },
});

/**
 * Assign a report to a volunteer.
 */
export const assignReport = mutation({
  args: {
    reportId: v.id("reports"),
    volunteerId: v.id("users"), // UI uses volunteerId
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role === "volunteer") {
      throw new Error("Unauthorized to assign reports");
    }

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      assignedVolunteerId: args.volunteerId,
      status: "assigned",
      assignedAt: Date.now(),
    });
  },
});

/**
 * Resolve a report.
 */
export const resolveReport = mutation({
  args: {
    reportId: v.id("reports"),
    resolutionPhoto: v.id("_storage"), // mandatory
    notes: v.string(), // mandatory description
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    let photoUrl: any = args.resolutionPhoto;
    const url = await ctx.storage.getUrl(args.resolutionPhoto);
    if (url) photoUrl = url;

    await ctx.db.patch(args.reportId, {
      status: "pending",
      resolutionPhoto: args.resolutionPhoto,
      resolutionNotes: args.notes,
      resolutionVerificationStatus: "pending",
      resolutionSubmittedAt: Date.now(),
    });

    // Notify Super Admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Resolution Submitted for Review",
        message: `Volunteer submitted a resolution for: ${report.title || "Untitled Incident"}`,
        type: "new_report",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});

/**
 * Volunteer resubmits a rejected resolution report.
 */
export const resubmitResolution = mutation({
  args: {
    reportId: v.id("reports"),
    notes: v.string(),
    resolutionPhoto: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    if (report.resolutionVerificationStatus !== "rejected") throw new Error("Only rejected resolutions can be resubmitted");

    const patch: any = {
      resolutionNotes: args.notes,
      resolutionVerificationStatus: "pending",
      status: "pending",
      resolutionSubmittedAt: Date.now(),
    };
    if (args.resolutionPhoto) patch.resolutionPhoto = args.resolutionPhoto;
    await ctx.db.patch(args.reportId, patch);

    // Notify Super Admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Resolution Resubmitted",
        message: `Volunteer resubmitted resolution for: ${report.title || "Untitled Incident"}`,
        type: "new_report",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});

/**
 * Super admin verifies a volunteer's resolution.
 */
export const verifyResolution = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, { 
      resolutionVerificationStatus: args.status,
      status: args.status === "accepted" ? "resolved" : "rejected",
      resolutionVerifiedAt: Date.now(),
    });

    // Notify the volunteer
    if (report.assignedVolunteerId) {
      await ctx.db.insert("notifications", {
        userId: report.assignedVolunteerId,
        title: args.status === "accepted" ? "Resolution Approved ✓" : "Resolution Rejected",
        message: args.status === "accepted"
          ? `Your resolution for "${report.title || "Untitled"}" was approved by admin.`
          : `Your resolution for "${report.title || "Untitled"}" was rejected. Please revise and resubmit.`,
        type: args.status === "accepted" ? "report_accepted" : "report_rejected",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});

export const getNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const markNotificationRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isRead: true });
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    // Filter out rejected reports from all stats to match the Live Feed and admin expectations
    const allReports = await ctx.db.query("reports").collect();
    const reports = allReports.filter(r => r.verificationStatus !== "rejected");
    
    const volunteers = await ctx.db.query("volunteers").collect();
    
    const total = reports.length;
    // Active means open or assigned
    const active = reports.filter(r => r.status === "open" || r.status === "assigned").length;
    // Resolved includes fully resolved, pending verification, and rejected resolutions
    const resolved = reports.filter(r => r.status === "resolved" || r.status === "pending" || r.status === "rejected").length;
    
    const volunteersOnline = volunteers.filter(v => v.isAvailable).length;
    const totalVolunteers = volunteers.length;

    const activeReports = reports.filter(r => r.status !== "resolved");

    const urgencyData = [
      { name: "Low", value: activeReports.filter(r => r.urgency === "low").length },
      { name: "Medium", value: activeReports.filter(r => r.urgency === "medium").length },
      { name: "High", value: activeReports.filter(r => r.urgency === "high").length },
    ];

    return { total, active, resolved, urgencyData, volunteersOnline, totalVolunteers };
  },
});
export const getReport = query({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.id);
    if (!report) return null;
    
    let photoUrl: any = report.reportPhoto;
    if (photoUrl && !(typeof photoUrl === 'string' && photoUrl.startsWith("http"))) {
       photoUrl = await ctx.storage.getUrl(photoUrl as any) || photoUrl;
    }

    let resolutionPhotoUrl: any = report.resolutionPhoto;
    if (resolutionPhotoUrl && !(typeof resolutionPhotoUrl === 'string' && resolutionPhotoUrl.startsWith("http"))) {
       const url = await ctx.storage.getUrl(resolutionPhotoUrl as any);
       if (url) resolutionPhotoUrl = url;
    }

    const worker = await ctx.db.get(report.workerId);
    const volunteer = report.assignedVolunteerId ? await ctx.db.get(report.assignedVolunteerId) : null;
    
    return {
      ...report,
      reportPhoto: photoUrl,
      resolutionPhoto: resolutionPhotoUrl,
      workerName: worker?.name || "Unknown Officer",
      workerJoinedAt: worker?._creationTime,
      volunteerName: volunteer?.name || "Unassigned",
      volunteerJoinedAt: volunteer?._creationTime,
    };
  },
});

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    // Filter duplicates by name to prevent frontend UI issues
    return categories.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
  },
});

export const addCategory = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") {
      throw new Error("Unauthorized");
    }
    return await ctx.db.insert("categories", args);
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") {
      throw new Error("Only super admins can delete categories.");
    }
    await ctx.db.delete(args.id);
  },
});

export const deleteReport = mutation({
  args: { id: v.id("reports") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(args.id);
  },
});

export const updateVerification = mutation({
  args: { 
    reportId: v.id("reports"),
    status: v.union(v.literal("accepted"), v.literal("rejected"), v.literal("pending"))
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch(args.reportId, { 
      verificationStatus: args.status,
      verifiedAt: Date.now(),
    });

    // Notify the field worker
    const report = await ctx.db.get(args.reportId);
    if (report && (args.status === "accepted" || args.status === "rejected")) {
      await ctx.db.insert("notifications", {
        userId: report.workerId,
        title: args.status === "accepted" ? "Report Approved" : "Report Rejected",
        message: args.status === "accepted" 
          ? `Your report "${report.title || 'Untitled'}" has been verified and accepted.`
          : `Your report "${report.title || 'Untitled'}" requires revision. Please check history.`,
        type: args.status === "accepted" ? "report_accepted" : "report_rejected",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});

/**
 * Allow a field worker to edit a rejected report and resubmit it.
 * Resets verificationStatus to "pending" so the admin reviews it again.
 */
export const editAndResubmitReport = mutation({
  args: {
    reportId: v.id("reports"),
    title: v.optional(v.string()),
    description: v.string(),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    category: v.string(),
    aiSummary: v.optional(v.string()),
    reportPhoto: v.optional(v.id("_storage")),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");
    if (report.workerId !== user._id) throw new Error("Not your report");
    if (report.verificationStatus !== "rejected") throw new Error("Only rejected reports can be edited");

    const { reportId, ...updates } = args;
    // Only override reportPhoto if a new one was uploaded
    const patch: any = { ...updates, verificationStatus: "pending", status: "open" };
    if (!args.reportPhoto) delete patch.reportPhoto; // keep existing if no new photo
    await ctx.db.patch(reportId, patch);

    // Notify Super Admins about resubmission
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Report Resubmitted",
        message: `A field worker has resubmitted report: ${args.title || "Unnamed Report"}`,
        type: "new_report",
        reportId,
        isRead: false,
      });
    }
  },
});

/**
 * Volunteer requests help for a specific report.
 */
export const requestHelp = mutation({
  args: {
    reportId: v.id("reports"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      helpStatus: "requested",
      helpRequest: args.description,
      helpRequestedAt: Date.now(),
    });

    // Notify Super Admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Help Requested 🆘",
        message: `Volunteer ${user.name} needs help with: ${report.title || "Untitled Incident"}`,
        type: "new_report",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});

/**
 * Super admin provides help for a report.
 */
export const provideHelp = mutation({
  args: {
    reportId: v.id("reports"),
    response: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "super_admin") throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      helpStatus: "provided",
      helpResponse: args.response,
      helpProvidedAt: Date.now(),
    });

    // Notify the volunteer
    if (report.assignedVolunteerId) {
      await ctx.db.insert("notifications", {
        userId: report.assignedVolunteerId,
        title: "Help Provided 🤝",
        message: `Admin has responded to your help request for "${report.title || "Untitled"}".`,
        type: "report_accepted",
        reportId: args.reportId,
        isRead: false,
      });
    }
  },
});
