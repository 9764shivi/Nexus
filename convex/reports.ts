import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { paginationOptsValidator } from "convex/server";

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
    status: v.optional(v.union(v.literal("open"), v.literal("assigned"), v.literal("resolved"))),
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
        return {
           ...report,
           reportPhoto: photoUrl as any
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
    });
  },
});

/**
 * Resolve a report.
 */
export const resolveReport = mutation({
  args: {
    reportId: v.id("reports"),
    resolutionPhoto: v.optional(v.id("_storage")), // storage id
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("Report not found");

    await ctx.db.patch(args.reportId, {
      status: "resolved",
      resolutionPhoto: args.resolutionPhoto,
      resolutionNotes: args.notes,
    });

    // Notify Super Admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "super_admin"))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        title: "Mission Resolved",
        message: `Incident #${report._id.slice(0, 5)} has been finalized by personnel.`,
        type: "report_resolved",
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
    // Active means open or assigned, and not resolved
    const active = reports.filter(r => r.status !== "resolved").length;
    const resolved = reports.filter(r => r.status === "resolved").length;
    
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

    const worker = await ctx.db.get(report.workerId);
    const volunteer = report.assignedVolunteerId ? await ctx.db.get(report.assignedVolunteerId) : null;
    
    return {
      ...report,
      reportPhoto: photoUrl,
      workerName: worker?.name || "Unknown Officer",
      volunteerName: volunteer?.name || "Unassigned",
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
    await ctx.db.patch(args.reportId, { verificationStatus: args.status });
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
