import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Summarize a report description and determine its urgency.
 * This is a placeholder for a real AI integration (e.g., OpenAI or Gemini).
 */
export const summarizeReport = action({
  args: {
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Placeholder AI logic
    // In a real app, you would call an AI API here.
    
    console.log("Analyzing description:", args.description);
    
    // Simulate some logic based on keywords
    const lowerDesc = args.description.toLowerCase();
    let urgency: "low" | "medium" | "high" = "medium";
    
    if (lowerDesc.includes("urgent") || lowerDesc.includes("emergency") || lowerDesc.includes("bleeding") || lowerDesc.includes("fire")) {
      urgency = "high";
    } else if (lowerDesc.includes("info") || lowerDesc.includes("update") || lowerDesc.includes("routine")) {
      urgency = "low";
    }
    
    // Simple summary: first 50 chars + ...
    const summary = args.description.length > 50 
      ? args.description.substring(0, 50) + "..." 
      : args.description;

    return {
      aiSummary: `AI Summary: ${summary}`,
      urgency: urgency,
    };
  },
});
