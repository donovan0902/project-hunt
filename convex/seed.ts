import { internalMutation } from "./functions";
import type { Id } from "./_generated/dataModel";

// Demo Teams
const TEAMS = [
  {
    name: "Honda Innovation Lab",
    description: "Internal tools and productivity solutions for Honda teams.",
  },
  {
    name: "Marysville Plant IT",
    description: "Technology solutions for manufacturing operations.",
  },
  {
    name: "R&D Software Group",
    description: "Engineering enablement and simulation tools.",
  },
  {
    name: "East Liberty Quality Team",
    description: "Quality assurance and inspection tooling.",
  },
  {
    name: "Connected Services Dev",
    description: "Vehicle connectivity and telematics applications.",
  },
];

// Demo Users
const USERS = [
  { name: "Alex Kim", externalId: "seed_user_1", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=AK", email: "a.kim@demo.honda.com" },
  { name: "Jordan Lee", externalId: "seed_user_2", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=JL", email: "j.lee@demo.honda.com" },
  { name: "Sam Patel", externalId: "seed_user_3", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=SP", email: "s.patel@demo.honda.com" },
  { name: "Morgan Chen", externalId: "seed_user_4", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=MC", email: "m.chen@demo.honda.com" },
  { name: "Taylor Nguyen", externalId: "seed_user_5", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=TN", email: "t.nguyen@demo.honda.com" },
  { name: "Casey Williams", externalId: "seed_user_6", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=CW", email: "c.williams@demo.honda.com" },
  { name: "Riley Thompson", externalId: "seed_user_7", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=RT", email: "r.thompson@demo.honda.com" },
  { name: "Jamie Park", externalId: "seed_user_8", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=JP", email: "j.park@demo.honda.com" },
  { name: "Drew Martinez", externalId: "seed_user_9", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=DM", email: "d.martinez@demo.honda.com" },
  { name: "Avery Johnson", externalId: "seed_user_10", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=AJ", email: "a.johnson@demo.honda.com" },
  { name: "Quinn Davis", externalId: "seed_user_11", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=QD", email: "q.davis@demo.honda.com" },
  { name: "Reese Tanaka", externalId: "seed_user_12", avatarUrlId: "https://api.dicebear.com/9.x/initials/svg?seed=RTa", email: "r.tanaka@demo.honda.com" },
];

// Smaller, focused projects (tools associates might build)
const PROJECTS: Array<{
  name: string;
  headline: string;
  summary: string;
  link?: string;
  teamIndex: number;
  userIndex: number;
  focusAreaNames: string[];
}> = [
  {
    name: "Torque Spec Lookup",
    headline: "Quick reference tool for fastener torque specifications",
    summary: "A simple search tool that lets technicians quickly find torque specs by part number or location. Pulls data from engineering docs and displays specs with diagrams. Saves time vs flipping through paper manuals.",
    teamIndex: 1,
    userIndex: 0,
    focusAreaNames: ["Manufacturing Automation & Robotics", "Training, Enablement & Knowledge Sharing"],
  },
  {
    name: "Shift Handoff Notes",
    headline: "Digital log for shift-to-shift communication",
    summary: "Replaces paper handoff logs with a quick mobile-friendly form. Captures issues, pending tasks, and equipment status. Previous shift notes auto-display when starting a new shift.",
    teamIndex: 1,
    userIndex: 1,
    focusAreaNames: ["Production Planning, Logistics & Material Flow", "Program Management & Engineering Workflows"],
  },
  {
    name: "Test Vehicle Finder",
    headline: "Track and locate test vehicles across campus",
    summary: "Simple app to check out test vehicles and see their current location. Integrates with badge readers at building entrances. No more walking around looking for the Accord you need.",
    teamIndex: 2,
    userIndex: 2,
    focusAreaNames: ["Testing, Validation & Verification Tools", "Vehicle Connectivity, Diagnostics & Telemetry"],
  },
  {
    name: "Wiring Harness Validator",
    headline: "Automated check for harness routing conflicts",
    summary: "Reads harness routing data and flags potential pinch points or interference with moving parts. Built to catch issues before prototype build. Uses existing CAD export files.",
    teamIndex: 2,
    userIndex: 3,
    focusAreaNames: ["Vehicle Simulation, Modeling & Virtual Validation", "Developer Productivity & Internal Tooling"],
  },
  {
    name: "Calibration File Diff",
    headline: "Compare ECU calibration files side-by-side",
    summary: "Upload two cal files and see what changed. Highlights parameter differences and groups by subsystem. Useful for tracking down why a new calibration behaves differently.",
    teamIndex: 2,
    userIndex: 4,
    focusAreaNames: ["EV Powertrain, Battery Systems & Energy Management", "Developer Productivity & Internal Tooling"],
  },
  {
    name: "SOP Video Index",
    headline: "Searchable index of standard operating procedure videos",
    summary: "Tags and indexes training videos so workers can search by task or station. Includes timestamp markers for specific steps. Faster than scrubbing through 20-minute videos.",
    teamIndex: 1,
    userIndex: 5,
    focusAreaNames: ["Training, Enablement & Knowledge Sharing", "AI, Automation & Knowledge Extraction"],
  },
  {
    name: "Cycle Time Tracker",
    headline: "Stopwatch app that logs station cycle times",
    summary: "Tap to start/stop timing. Automatically logs times to a spreadsheet with station ID. Shows rolling average and highlights outliers. Built for kaizen studies.",
    teamIndex: 1,
    userIndex: 0,
    focusAreaNames: ["Manufacturing Automation & Robotics", "Data Engineering, Pipelines & Analytics"],
  },
  {
    name: "Battery Cell Tester Dashboard",
    headline: "Real-time display of cell testing station status",
    summary: "Shows which cells are testing, time remaining, and pass/fail history. Pulls data from existing test equipment via serial port. Helps technicians manage multiple test stations.",
    teamIndex: 2,
    userIndex: 1,
    focusAreaNames: ["EV Powertrain, Battery Systems & Energy Management", "Data Engineering, Pipelines & Analytics"],
  },
  {
    name: "Parts Shortage Notifier",
    headline: "Slack alerts when parts inventory drops below threshold",
    summary: "Monitors inventory system and sends alerts to relevant channel when stock gets low. Configurable thresholds per part. Helps avoid line stoppages from part shortages.",
    teamIndex: 1,
    userIndex: 2,
    focusAreaNames: ["Production Planning, Logistics & Material Flow"],
  },
  {
    name: "NVH Recording Logger",
    headline: "Tag and organize noise recordings from test drives",
    summary: "Record audio during test drives with GPS location and timestamps. Add voice notes about conditions. Syncs to shared drive with searchable metadata. Replaces paper NVH logs.",
    teamIndex: 2,
    userIndex: 3,
    focusAreaNames: ["Testing, Validation & Verification Tools", "Quality, Inspection & Defect Detection"],
  },
  {
    name: "Safety Checklist App",
    headline: "Digital daily safety inspection forms",
    summary: "Replace paper safety checklists with mobile forms. Requires photo for certain items. Flags overdue inspections. Dashboard shows compliance by area.",
    teamIndex: 1,
    userIndex: 4,
    focusAreaNames: ["Safety, Compliance & Industrial Standards"],
  },
  {
    name: "Meeting Room Displays",
    headline: "Show current and next meeting on room tablets",
    summary: "Simple display app for tablets mounted outside conference rooms. Shows room name, current meeting, and next booking. One-tap to report room issues.",
    teamIndex: 0,
    userIndex: 5,
    focusAreaNames: ["Program Management & Engineering Workflows"],
  },
  {
    name: "DTC Code Explainer",
    headline: "Plain-English explanations for diagnostic trouble codes",
    summary: "Enter a DTC and get a clear explanation of what it means, likely causes, and suggested first steps. Pulls from internal knowledge base. Helps new technicians get up to speed faster.",
    teamIndex: 4,
    userIndex: 6,
    focusAreaNames: ["Vehicle Connectivity, Diagnostics & Telemetry", "Training, Enablement & Knowledge Sharing"],
  },
  {
    name: "Paint Booth Humidity Monitor",
    headline: "Real-time humidity tracking with alert thresholds",
    summary: "Displays current humidity levels across paint booth zones. Sends alerts when levels drift outside acceptable range. Logs historical data for quality investigations.",
    teamIndex: 3,
    userIndex: 7,
    focusAreaNames: ["Quality, Inspection & Defect Detection", "Data Engineering, Pipelines & Analytics"],
  },
  {
    name: "Supplier Contact Lookup",
    headline: "Quick search for supplier emergency contacts",
    summary: "Search by part number or supplier name to find the right contact for urgent issues. Includes after-hours numbers and escalation paths. Faster than digging through SharePoint.",
    teamIndex: 1,
    userIndex: 8,
    focusAreaNames: ["Production Planning, Logistics & Material Flow"],
  },
  {
    name: "ADAS Sensor Log Viewer",
    headline: "Browse and filter sensor data from test drives",
    summary: "Upload sensor logs and visualize camera, radar, and lidar data on a timeline. Filter by event type or confidence level. Helps engineers find specific scenarios quickly.",
    teamIndex: 2,
    userIndex: 9,
    focusAreaNames: ["ADAS, Perception & Driving Intelligence", "Data Engineering, Pipelines & Analytics"],
  },
  {
    name: "Prototype Parts Tracker",
    headline: "Track status and location of prototype components",
    summary: "Log when prototype parts arrive, where they're stored, and which vehicle they're installed in. Scan QR codes to update status. No more lost prototype parts.",
    teamIndex: 2,
    userIndex: 10,
    focusAreaNames: ["Testing, Validation & Verification Tools", "Program Management & Engineering Workflows"],
  },
  {
    name: "Weld Defect Photo Log",
    headline: "Capture and categorize weld quality issues",
    summary: "Take photos of weld defects, tag by defect type and station, and submit for review. Creates a searchable database for quality trend analysis. Replaces paper defect cards.",
    teamIndex: 3,
    userIndex: 11,
    focusAreaNames: ["Quality, Inspection & Defect Detection", "Manufacturing Automation & Robotics"],
  },
  {
    name: "CAN Bus Message Decoder",
    headline: "Decode raw CAN messages to human-readable values",
    summary: "Paste hex CAN data and see decoded signal values. Supports custom DBC files. Useful for debugging communication issues during vehicle integration.",
    teamIndex: 4,
    userIndex: 0,
    focusAreaNames: ["Vehicle Connectivity, Diagnostics & Telemetry", "Developer Productivity & Internal Tooling"],
  },
  {
    name: "Tooling Wear Tracker",
    headline: "Log and predict tool replacement schedules",
    summary: "Track usage cycles for cutting tools and dies. Predicts when tools need replacement based on historical wear patterns. Reduces unplanned downtime from tool failures.",
    teamIndex: 1,
    userIndex: 1,
    focusAreaNames: ["Manufacturing Automation & Robotics", "AI, Automation & Knowledge Extraction"],
  },
  {
    name: "ECU Flash Status Board",
    headline: "Monitor ECU programming stations across the plant",
    summary: "Dashboard showing which vehicles are being flashed, progress percentage, and any failures. Helps production supervisors spot bottlenecks at flash stations.",
    teamIndex: 1,
    userIndex: 2,
    focusAreaNames: ["In-Vehicle Software, HMI & UX Systems", "Production Planning, Logistics & Material Flow"],
  },
  {
    name: "Drawing Revision Notifier",
    headline: "Get alerts when engineering drawings are updated",
    summary: "Subscribe to specific part numbers and get notified when drawings change. Shows diff of what changed between revisions. Prevents building to outdated specs.",
    teamIndex: 2,
    userIndex: 3,
    focusAreaNames: ["Program Management & Engineering Workflows", "Developer Productivity & Internal Tooling"],
  },
  {
    name: "Battery Thermal Runaway Sim",
    headline: "Quick thermal propagation estimates for cell layouts",
    summary: "Input cell spacing and cooling parameters to estimate thermal propagation timing. Not a replacement for full simulation but good for early design exploration.",
    teamIndex: 2,
    userIndex: 4,
    focusAreaNames: ["EV Powertrain, Battery Systems & Energy Management", "Vehicle Simulation, Modeling & Virtual Validation"],
  },
  {
    name: "Andon Call Analytics",
    headline: "Dashboard of andon call patterns by station and shift",
    summary: "Visualize which stations trigger the most andon calls and when. Filter by reason code and shift. Helps identify chronic issues for kaizen focus.",
    teamIndex: 1,
    userIndex: 5,
    focusAreaNames: ["Data Engineering, Pipelines & Analytics", "Manufacturing Automation & Robotics"],
  },
  {
    name: "HMI Click Heatmap",
    headline: "Visualize touch patterns on infotainment prototypes",
    summary: "Records touch events during usability testing and displays as heatmap overlay. Shows where users tap, how long they hesitate, and missed touch targets.",
    teamIndex: 4,
    userIndex: 6,
    focusAreaNames: ["In-Vehicle Software, HMI & UX Systems", "Testing, Validation & Verification Tools"],
  },
  {
    name: "OBD-II Live Monitor",
    headline: "Real-time OBD parameter display for diagnostics",
    summary: "Connect via Bluetooth OBD adapter and see live sensor values. Log sessions for later review. Supports custom PID definitions for Honda-specific parameters.",
    teamIndex: 4,
    userIndex: 7,
    focusAreaNames: ["Vehicle Connectivity, Diagnostics & Telemetry", "Testing, Validation & Verification Tools"],
  },
  {
    name: "Ergonomics Assessment Tool",
    headline: "Score workstation ergonomics with guided checklists",
    summary: "Walk through a station assessment with prompts for reach, posture, and force requirements. Generates risk scores and improvement suggestions. Supports safety team audits.",
    teamIndex: 1,
    userIndex: 8,
    focusAreaNames: ["Safety, Compliance & Industrial Standards", "Training, Enablement & Knowledge Sharing"],
  },
];

// Comments for projects
const COMMENTS: Array<{
  projectIndex: number;
  userIndex: number;
  content: string;
}> = [
  { projectIndex: 0, userIndex: 2, content: "This would save me so much time. Currently I have to search through three different PDFs." },
  { projectIndex: 0, userIndex: 4, content: "Could this include the tool size needed too? That's often what I'm looking for." },
  
  { projectIndex: 1, userIndex: 3, content: "We tried paper logs for years. This is way better. Can we add photos?" },
  
  { projectIndex: 2, userIndex: 0, content: "Finally! I've wasted so many hours looking for test vehicles." },
  { projectIndex: 2, userIndex: 5, content: "Does it work with the new badge readers in Building 3?" },
  
  { projectIndex: 3, userIndex: 1, content: "Caught a routing issue last week that would have been expensive to fix after build. Nice tool." },
  
  { projectIndex: 4, userIndex: 0, content: "The grouping by subsystem is really helpful. Makes it easy to focus on just throttle changes." },
  
  { projectIndex: 5, userIndex: 2, content: "The timestamp feature is great. New hires can jump right to the step they need." },
  
  { projectIndex: 6, userIndex: 3, content: "Simple but effective. Our kaizen team uses this every day now." },
  
  { projectIndex: 7, userIndex: 5, content: "Can we add temperature readings to the dashboard too?" },
  
  { projectIndex: 8, userIndex: 1, content: "Saved us from a line stop last Tuesday. Got the alert with enough time to expedite parts." },
  
  { projectIndex: 10, userIndex: 0, content: "The photo requirement is key. Makes inspections actually meaningful." },

  // New project comments
  { projectIndex: 12, userIndex: 9, content: "This is great for new techs. Some DTCs are really cryptic without context." },
  { projectIndex: 12, userIndex: 3, content: "Can you add Honda-specific codes that aren't in the standard OBD list?" },
  
  { projectIndex: 13, userIndex: 10, content: "We had a humidity spike last month that caused defects. Wish we had this earlier." },
  
  { projectIndex: 14, userIndex: 0, content: "Used this at 2am when we had a delivery issue. Found the right person in seconds." },
  
  { projectIndex: 15, userIndex: 11, content: "The timeline view is really intuitive. Makes finding edge cases much easier." },
  { projectIndex: 15, userIndex: 4, content: "Any plans to support the new lidar format from the 2025 models?" },
  
  { projectIndex: 16, userIndex: 6, content: "We lost a prototype motor for three days once. This would have helped." },
  
  { projectIndex: 17, userIndex: 8, content: "The defect categorization is helpful for tracking trends across shifts." },
  
  { projectIndex: 18, userIndex: 2, content: "Saved me hours of manual decoding. The custom DBC support is clutch." },
  
  { projectIndex: 19, userIndex: 7, content: "Predictive maintenance is the future. Nice to see it applied to tooling." },
  
  { projectIndex: 20, userIndex: 5, content: "Flash failures were a mystery before. Now we can see patterns." },
  
  { projectIndex: 21, userIndex: 1, content: "I've been burned by outdated drawings before. Subscribing to everything now." },
  
  { projectIndex: 23, userIndex: 9, content: "Visual data is so much more actionable than spreadsheets of call logs." },
  
  { projectIndex: 24, userIndex: 10, content: "The hesitation timing data is really valuable for UX improvements." },
  
  { projectIndex: 25, userIndex: 3, content: "Works great with my cheap Amazon OBD adapter. Very reliable." },
  
  { projectIndex: 26, userIndex: 11, content: "Our safety team loves this. Makes audits much more consistent." },
];

// Replies
const REPLIES: Array<{
  parentCommentIndex: number;
  userIndex: number;
  content: string;
}> = [
  { parentCommentIndex: 1, userIndex: 0, content: "Good idea, I'll add tool size in the next update." },
  { parentCommentIndex: 4, userIndex: 2, content: "Yes, we updated the integration last month. Building 3 should work now." },
  { parentCommentIndex: 9, userIndex: 1, content: "Temperature is on the roadmap. Need to wire up the thermocouple data first." },
  { parentCommentIndex: 13, userIndex: 6, content: "Yes! Honda-specific codes are coming in the next release." },
  { parentCommentIndex: 16, userIndex: 9, content: "New lidar support is in testing. Should be ready next sprint." },
  { parentCommentIndex: 21, userIndex: 3, content: "You can set up filters to only get notified about specific revision types too." },
];

// Upvote distribution (higher counts to show more activity)
const UPVOTE_DISTRIBUTION = [
  { projectIndex: 0, count: 11 },
  { projectIndex: 1, count: 9 },
  { projectIndex: 2, count: 12 },
  { projectIndex: 3, count: 7 },
  { projectIndex: 4, count: 8 },
  { projectIndex: 5, count: 10 },
  { projectIndex: 6, count: 12 },
  { projectIndex: 7, count: 6 },
  { projectIndex: 8, count: 12 },
  { projectIndex: 9, count: 8 },
  { projectIndex: 10, count: 9 },
  { projectIndex: 11, count: 5 },
  { projectIndex: 12, count: 11 },
  { projectIndex: 13, count: 7 },
  { projectIndex: 14, count: 10 },
  { projectIndex: 15, count: 12 },
  { projectIndex: 16, count: 9 },
  { projectIndex: 17, count: 8 },
  { projectIndex: 18, count: 11 },
  { projectIndex: 19, count: 7 },
  { projectIndex: 20, count: 10 },
  { projectIndex: 21, count: 12 },
  { projectIndex: 22, count: 6 },
  { projectIndex: 23, count: 11 },
  { projectIndex: 24, count: 9 },
  { projectIndex: 25, count: 8 },
  { projectIndex: 26, count: 10 },
];

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingUser = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", "seed_user_1"))
      .first();
    
    if (existingUser) {
      console.log("Database appears to already be seeded. Skipping...");
      return { message: "Already seeded", seeded: false };
    }

    console.log("Starting database seed...");

    // 1. Load existing Focus Areas
    console.log("Loading focus areas...");
    const allFocusAreas = await ctx.db.query("focusAreas").collect();
    const focusAreaMap = new Map<string, Id<"focusAreas">>();
    for (const fa of allFocusAreas) {
      focusAreaMap.set(fa.name, fa._id);
    }

    // 2. Create Teams
    console.log("Creating teams...");
    const teamIds: Id<"teams">[] = [];
    for (const team of TEAMS) {
      const teamId = await ctx.db.insert("teams", {
        name: team.name,
        description: team.description,
        createdAt: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
      teamIds.push(teamId);
    }

    // 3. Create Users
    console.log("Creating users...");
    const userIds: Id<"users">[] = [];
    for (let i = 0; i < USERS.length; i++) {
      const user = USERS[i];
      const teamId = teamIds[i % teamIds.length];
      const userId = await ctx.db.insert("users", {
        name: user.name,
        externalId: user.externalId,
        avatarUrlId: user.avatarUrlId,
        email: user.email,
        teamId,
      });
      userIds.push(userId);
    }

    // 4. Create Projects
    console.log("Creating projects...");
    const projectIds: Id<"projects">[] = [];
    for (const project of PROJECTS) {
      const focusAreaIds = project.focusAreaNames
        .map((name) => focusAreaMap.get(name))
        .filter((id): id is Id<"focusAreas"> => id !== undefined);

      const projectId = await ctx.db.insert("projects", {
        name: project.name,
        headline: project.headline,
        summary: project.summary,
        link: project.link,
        teamId: teamIds[project.teamIndex],
        userId: USERS[project.userIndex].externalId,
        upvotes: 0,
        status: "active",
        focusAreaIds,
      });
      projectIds.push(projectId);
    }

    // 5. Create Upvotes
    console.log("Creating upvotes...");
    for (const { projectIndex, count } of UPVOTE_DISTRIBUTION) {
      const projectId = projectIds[projectIndex];
      const shuffledUserIndices = [...Array(USERS.length).keys()].sort(() => Math.random() - 0.5);
      const upvoterCount = Math.min(count, USERS.length);
      
      for (let i = 0; i < upvoterCount; i++) {
        await ctx.db.insert("upvotes", {
          projectId,
          userId: USERS[shuffledUserIndices[i]].externalId,
          createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
        });
      }
    }

    // 6. Create Comments
    console.log("Creating comments...");
    const commentIds: Id<"comments">[] = [];
    for (const comment of COMMENTS) {
      const commentId = await ctx.db.insert("comments", {
        projectId: projectIds[comment.projectIndex],
        userId: USERS[comment.userIndex].externalId,
        content: comment.content,
        createdAt: Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000),
        upvotes: Math.floor(Math.random() * 4),
      });
      commentIds.push(commentId);
    }

    // 7. Create Replies
    console.log("Creating replies...");
    for (const reply of REPLIES) {
      const parentComment = await ctx.db.get(commentIds[reply.parentCommentIndex]);
      if (parentComment) {
        await ctx.db.insert("comments", {
          projectId: parentComment.projectId,
          userId: USERS[reply.userIndex].externalId,
          content: reply.content,
          parentCommentId: commentIds[reply.parentCommentIndex],
          createdAt: Date.now() - Math.floor(Math.random() * 3 * 24 * 60 * 60 * 1000),
          upvotes: Math.floor(Math.random() * 2),
        });
      }
    }

    console.log("Seed complete!");
    return {
      message: "Database seeded successfully",
      seeded: true,
      stats: {
        teams: teamIds.length,
        users: userIds.length,
        projects: projectIds.length,
        comments: commentIds.length + REPLIES.length,
      },
    };
  },
});

export const clearSeedData = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Clearing seed data...");

    const seedUsers = await ctx.db
      .query("users")
      .filter((q) => 
        q.or(
          q.eq(q.field("externalId"), "seed_user_1"),
          q.eq(q.field("externalId"), "seed_user_2"),
          q.eq(q.field("externalId"), "seed_user_3"),
          q.eq(q.field("externalId"), "seed_user_4"),
          q.eq(q.field("externalId"), "seed_user_5"),
          q.eq(q.field("externalId"), "seed_user_6"),
          q.eq(q.field("externalId"), "seed_user_7"),
          q.eq(q.field("externalId"), "seed_user_8"),
          q.eq(q.field("externalId"), "seed_user_9"),
          q.eq(q.field("externalId"), "seed_user_10"),
          q.eq(q.field("externalId"), "seed_user_11"),
          q.eq(q.field("externalId"), "seed_user_12")
        )
      )
      .collect();

    if (seedUsers.length === 0) {
      return { message: "No seed data found", cleared: false };
    }

    const seedUserIds = new Set(seedUsers.map((u) => u.externalId));

    // Delete comments by seed users
    const allComments = await ctx.db.query("comments").collect();
    for (const comment of allComments) {
      if (seedUserIds.has(comment.userId)) {
        const commentUpvotes = await ctx.db
          .query("commentUpvotes")
          .withIndex("by_comment", (q) => q.eq("commentId", comment._id))
          .collect();
        for (const upvote of commentUpvotes) {
          await ctx.db.delete(upvote._id);
        }
        await ctx.db.delete(comment._id);
      }
    }

    // Delete upvotes by seed users
    const allUpvotes = await ctx.db.query("upvotes").collect();
    for (const upvote of allUpvotes) {
      if (seedUserIds.has(upvote.userId)) {
        await ctx.db.delete(upvote._id);
      }
    }

    // Delete projects by seed users
    const allProjects = await ctx.db.query("projects").collect();
    for (const project of allProjects) {
      if (seedUserIds.has(project.userId)) {
        const media = await ctx.db
          .query("mediaFiles")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        for (const m of media) {
          await ctx.db.delete(m._id);
        }
        await ctx.db.delete(project._id);
      }
    }

    // Get team IDs before deleting users
    const teamIdsToDelete = new Set<Id<"teams">>();
    for (const user of seedUsers) {
      if (user.teamId) {
        teamIdsToDelete.add(user.teamId);
      }
    }

    // Delete seed users
    for (const user of seedUsers) {
      await ctx.db.delete(user._id);
    }

    // Delete orphaned teams
    for (const teamId of teamIdsToDelete) {
      const usersWithTeam = await ctx.db
        .query("users")
        .withIndex("by_teamId", (q) => q.eq("teamId", teamId))
        .collect();
      
      if (usersWithTeam.length === 0) {
        await ctx.db.delete(teamId);
      }
    }

    console.log("Seed data cleared!");
    return { message: "Seed data cleared successfully", cleared: true };
  },
});

