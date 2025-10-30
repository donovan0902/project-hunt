import { internalMutation } from "../_generated/server";

/**
 * Migration to remove legacy 'lead' and 'leadInitials' fields from projects
 * Run this once to clean up old data
 */
export const removeLeadFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    
    let updatedCount = 0;
    
    for (const project of projects) {
      // Check if the project has lead fields (they're not in schema but may exist in data)
      const projectData = project as any;
      
      if ('lead' in projectData || 'leadInitials' in projectData) {
        // Create a new object without lead fields
        const { lead, leadInitials, ...cleanProject } = projectData;
        
        // Replace the document
        await ctx.db.replace(project._id, {
          name: cleanProject.name,
          summary: cleanProject.summary,
          team: cleanProject.team,
          upvotes: cleanProject.upvotes,
          status: cleanProject.status,
          userId: cleanProject.userId,
          ...(cleanProject.entryId ? { entryId: cleanProject.entryId } : {}),
        });
        
        updatedCount++;
      }
    }
    
    return {
      totalProjects: projects.length,
      updatedProjects: updatedCount,
      message: `Successfully removed lead fields from ${updatedCount} projects`,
    };
  },
});
