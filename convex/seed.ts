import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Create Focus Areas
    const focusAreaIds: Id<"focusAreas">[] = [];
    const focusAreas = [
      { name: "Focus Area A", group: "Technical", description: "Technical focus area" },
      { name: "Focus Area B", group: "Technical", description: "Another technical focus area" },
      { name: "Focus Area C", group: "Business", description: "Business focus area" },
      { name: "Focus Area D", group: "Business", description: "Another business focus area" },
      { name: "Focus Area E", group: "Design", description: "Design focus area" },
    ];

    for (const focusArea of focusAreas) {
      const id = await ctx.db.insert("focusAreas", {
        ...focusArea,
        isActive: true,
        createdAt: now,
      });
      focusAreaIds.push(id);
    }

    // 2. Create Teams
    const teamIds: Id<"teams">[] = [];
    const teams = [
      { name: "Team A", description: "Sample team A" },
      { name: "Team B", description: "Sample team B" },
    ];

    for (const team of teams) {
      const id = await ctx.db.insert("teams", {
        ...team,
        createdAt: now,
      });
      teamIds.push(id);
    }

    // 3. Create Users
    const userIds: Id<"users">[] = [];
    const users = [
      { name: "User 1", teamId: teamIds[0] },
      { name: "User 2", teamId: teamIds[0] },
      { name: "User 3", teamId: teamIds[1] },
      { name: "User 4", teamId: undefined }, // No team
    ];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const id = await ctx.db.insert("users", {
        name: user.name,
        tokenIdentifier: `https://preview-workos.com/oauth/user_${String(i + 1).padStart(2, "0")}`,
        workosUserId: `user_preview_${String(i + 1).padStart(2, "0")}`,
        onboardingCompleted: true,
        teamId: user.teamId,
      });
      userIds.push(id);
    }

    // 4. Create User Focus Areas
    const userFocusAreaMappings = [
      { userId: userIds[0], focusAreaIds: [focusAreaIds[0], focusAreaIds[1]] },
      { userId: userIds[1], focusAreaIds: [focusAreaIds[2]] },
      { userId: userIds[2], focusAreaIds: [focusAreaIds[3], focusAreaIds[4]] },
      { userId: userIds[3], focusAreaIds: [focusAreaIds[0]] },
    ];

    let userFocusAreaCount = 0;
    for (const mapping of userFocusAreaMappings) {
      for (const focusAreaId of mapping.focusAreaIds) {
        await ctx.db.insert("userFocusAreas", {
          userId: mapping.userId,
          focusAreaId,
          createdAt: now,
        });
        userFocusAreaCount++;
      }
    }

    // 5. Create Projects
    const projectIds: Id<"projects">[] = [];
    const projects = [
      {
        name: "Project 1",
        summary: "This is a sample project for testing.",
        headline: "Sample project 1",
        userId: userIds[0],
        teamId: teamIds[0],
        focusAreaIds: [focusAreaIds[0], focusAreaIds[1]],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 5,
      },
      {
        name: "Project 2",
        summary: "Another sample project for testing.",
        headline: "Sample project 2",
        userId: userIds[1],
        teamId: teamIds[0],
        focusAreaIds: [focusAreaIds[2]],
        status: "active" as const,
        readinessStatus: "in_progress" as const,
        upvotes: 3,
      },
      {
        name: "Project 3",
        summary: "Third sample project.",
        userId: userIds[2],
        teamId: teamIds[1],
        focusAreaIds: [focusAreaIds[3]],
        status: "pending" as const,
        readinessStatus: "in_progress" as const,
        upvotes: 1,
      },
      {
        name: "Project 4",
        summary: "Fourth sample project.",
        userId: userIds[3],
        teamId: undefined,
        focusAreaIds: [focusAreaIds[0], focusAreaIds[4]],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 8,
      },
      {
        name: "Project 5",
        summary: "Fifth sample project.",
        userId: userIds[0],
        teamId: teamIds[0],
        focusAreaIds: [focusAreaIds[1]],
        status: "active" as const,
        readinessStatus: "ready_to_use" as const,
        upvotes: 2,
      },
    ];

    for (const project of projects) {
      const id = await ctx.db.insert("projects", {
        name: project.name,
        summary: project.summary,
        headline: project.headline,
        userId: project.userId,
        teamId: project.teamId,
        focusAreaIds: project.focusAreaIds,
        status: project.status,
        readinessStatus: project.readinessStatus,
        upvotes: project.upvotes,
      });
      projectIds.push(id);
    }

    // 6. Create Comments
    const commentIds: Id<"comments">[] = [];
    const comments = [
      { projectId: projectIds[0], userId: userIds[1], content: "This is a comment." },
      { projectId: projectIds[0], userId: userIds[2], content: "Another comment." },
      { projectId: projectIds[1], userId: userIds[0], content: "Great project!" },
      { projectId: projectIds[2], userId: userIds[3], content: "Interesting idea." },
      { projectId: projectIds[3], userId: userIds[1], content: "Nice work!" },
    ];

    for (const comment of comments) {
      const id = await ctx.db.insert("comments", {
        ...comment,
        createdAt: now,
        upvotes: 0,
      });
      commentIds.push(id);
    }

    // Add a couple reply comments
    await ctx.db.insert("comments", {
      projectId: projectIds[0],
      userId: userIds[0],
      content: "Thanks for the feedback!",
      parentCommentId: commentIds[0],
      createdAt: now,
      upvotes: 1,
    });

    await ctx.db.insert("comments", {
      projectId: projectIds[1],
      userId: userIds[1],
      content: "Appreciate it!",
      parentCommentId: commentIds[2],
      createdAt: now,
      upvotes: 0,
    });

    // 7. Create Project Upvotes
    let projectUpvoteCount = 0;
    const projectUpvotes = [
      { projectId: projectIds[0], userIds: [userIds[1], userIds[2], userIds[3]] },
      { projectId: projectIds[1], userIds: [userIds[0], userIds[3]] },
      { projectId: projectIds[2], userIds: [userIds[1]] },
      { projectId: projectIds[3], userIds: [userIds[0], userIds[1], userIds[2]] },
      { projectId: projectIds[4], userIds: [userIds[2], userIds[3]] },
    ];

    for (const mapping of projectUpvotes) {
      for (const userId of mapping.userIds) {
        await ctx.db.insert("upvotes", {
          projectId: mapping.projectId,
          userId,
          createdAt: now,
        });
        projectUpvoteCount++;
      }
    }

    // 8. Create Comment Upvotes
    let commentUpvoteCount = 0;
    const commentUpvotes = [
      { commentId: commentIds[0], userIds: [userIds[0], userIds[3]] },
      { commentId: commentIds[1], userIds: [userIds[1]] },
      { commentId: commentIds[2], userIds: [userIds[2], userIds[3]] },
      { commentId: commentIds[3], userIds: [userIds[0]] },
      { commentId: commentIds[4], userIds: [userIds[0], userIds[2]] },
    ];

    for (const mapping of commentUpvotes) {
      for (const userId of mapping.userIds) {
        await ctx.db.insert("commentUpvotes", {
          commentId: mapping.commentId,
          userId,
          createdAt: now,
        });
        commentUpvoteCount++;
      }
    }

    return {
      success: true,
      summary: {
        focusAreas: focusAreas.length,
        teams: teams.length,
        users: users.length,
        userFocusAreas: userFocusAreaCount,
        projects: projects.length,
        comments: comments.length + 2, // +2 for reply comments
        projectUpvotes: projectUpvoteCount,
        commentUpvotes: commentUpvoteCount,
      },
    };
  },
});