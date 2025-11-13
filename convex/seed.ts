import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { rag } from "./rag";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Mock data generators
const FIRST_NAMES = [
  "Hiroshi", "Akira", "Naomi", "Kenji", "Mika", "Yusuke", "Sakura", "Takumi",
  "Emi", "Daichi", "Haruka", "Ren", "Minato", "Yuki", "Satoshi", "Aya",
  "Kazuo", "Mei", "Jun", "Taro", "Aiko", "Shinji", "Kenta", "Riku",
  "Miyu", "Sora", "Hayato", "Itsuki", "Rina", "Noa", "Liam", "Emma",
  "Sofia", "Ethan", "Carlos", "Maria", "Priya", "Arjun", "Amelia", "Noah"
];

const LAST_NAMES = [
  "Tanaka", "Sato", "Suzuki", "Yamada", "Kobayashi", "Fujimoto", "Nakamura", "Ito",
  "Takeda", "Mori", "Kato", "Inoue", "Kimura", "Honda", "Matsumoto", "Watanabe",
  "Kawasaki", "Okada", "Yoshida", "Abe", "Garcia", "Lopez", "Martinez", "Williams",
  "Johnson", "Singh", "Patel", "Nguyen", "Park", "Schmidt", "Anderson", "Silva",
  "Kumar", "Fernandez", "Brown", "Choi", "Li", "Khan", "Bautista", "O'Neill"
];

const TEAM_NAMES = [
  "Advanced Electrification Systems", "Hydrogen Powertrain Group", "Autonomous Systems Lab", "Chassis Dynamics Group", "Acoustic Engineering Lab",
  "Motorcycle Safety Engineering", "Energy Recovery Systems", "Materials Innovation Unit", "Sustainability Integration Office", "Connected Mobility Platform",
  "Manufacturing Robotics Center", "Powertrain Analytics Team", "Cabin Experience Studio", "Digital Twin Operations", "Smart Factory Programs",
  "Urban Mobility Solutions", "Advanced Sensing Lab", "Driver Experience Research", "Sustainable Materials Lab", "Advanced Aerodynamics Lab"
];

const PROJECT_CATEGORIES = {
  electrification: {
    names: [
      "Solid-State Battery Thermal Rig", "eAxle NVH Control Suite", "Thermal Scavenging Heat Pump", "Composite Battery Enclosure", "Energy Recuperation Map"
    ],
    summaries: [
      "Instrumented rig mapping gradients across 52-cell solid-state modules under extreme duty cycles.",
      "DSP-based cancellation firmware taming torsional harmonics in high-torque eAxles.",
      "Closed-loop heat pump reclaiming inverter and motor waste heat to extend winter range.",
      "Hybrid composite enclosure with integrated cooling for next-gen battery trays.",
      "Adaptive brake blending logic harmonizing regen and hydraulic response by driver persona."
    ],
    headlines: [
      "Calibrating Gen5 packs for extreme cold",
      "Quieter drivetrains without efficiency loss",
      "Stretching EV range in winter climates",
      "Dropping 18 kg per pack without compromise",
      "Smoother regen transitions for performance"
    ]
  },
  hydrogen: {
    names: [
      "Hydrogen Stack Digital Twin", "Hydrogen Microgrid Pilot", "Hydrogen Scooter Module", "Tank Integrity Monitor", "Hydrogen Refueling Analytics"
    ],
    summaries: [
      "Physics-informed twin forecasting catalyst degradation across 10,000-hour duty cycles.",
      "Solar-powered electrolyzer and storage loop feeding dyno cells with green hydrogen.",
      "Compact metal hydride storage and fuel cell module for urban scooter platforms.",
      "Sensor suite monitoring thermal and pressure profiles for composite hydrogen tanks.",
      "Data pipeline optimizing fill curves and detecting nozzle health across stations."
    ],
    headlines: [
      "Extending stack life with real-time insight",
      "Decarbonizing test cells with onsite hydrogen",
      "Zero-emission power for last-mile fleets",
      "Confidence in 700-bar composite tanks",
      "Faster, safer hydrogen pit stops"
    ]
  },
  autonomy: {
    names: [
      "Autonomous Merge Simulator", "Snow Navigation Dataset", "Driver Coaching AI", "Predictive Stability HUD", "Aerodynamic Wheel Shutters"
    ],
    summaries: [
      "Sensor, V2X, and human-behavior simulator for graceful freeway merge negotiation.",
      "LiDAR, radar, and traction dataset from winter proving grounds for autonomous tuning.",
      "Onboard AI translating telemetry into feedback for track and efficiency programs.",
      "Heads-up guidance fusing IMU data with friction forecasts to warn riders early.",
      "Active wheel shutters balancing cooling needs with drag reduction in real time."
    ],
    headlines: [
      "Level 3 vehicles that read social cues",
      "Confident autonomy on snow-packed roads",
      "Helping drivers extract more from Type R",
      "Giving riders anticipatory balance cues",
      "Dynamic aero without brake fade"
    ]
  },
  manufacturing: {
    names: [
      "Robotic Welding Vision Co-Pilot", "Smart Logistics Swarm", "Digital Twin Replay", "Cabin Acoustic Tuning", "Recycled Honeycomb Chassis"
    ],
    summaries: [
      "Vision-guided weld robots correcting stamped panel variance in real time.",
      "Swarm-coordinated autonomous parts runners cutting assembly cell wait times.",
      "Replay engine synchronizing PLC, torque, and vision data to diagnose line events.",
      "Zonal audio and noise cancellation tuned per seat with OTA personalization.",
      "Recycled aluminum honeycomb structures delivering lighter skateboard frames."
    ],
    headlines: [
      "Self-correcting weld seams on BIW lines",
      "Keeping the line fed with autonomous runners",
      "Diagnosing production anomalies in minutes",
      "Tailoring quiet zones per passenger",
      "Closing the loop on lightweight structures"
    ]
  }
};

const COMMENT_TEMPLATES = [
  "Curious how this behaves after a -30°C cold soak? Manitoba fleet will want to know.",
  "Love the data density here. Does the rig log raw CAN frames for reuse?",
  "Great progress! Could we share the model with the Tochigi validation team?",
  "Any path to port this control loop into the Indiana pilot line PLC stack?",
  "Impressive! How are you handling hydrogen purge logic during idle dwell?",
  "Can we expose a simple UI for the test drivers to annotate anomalies on track?",
  "This looks production-ready. What's the plan for ISO26262 review?",
  "How much range delta did we see on the Canadian winter fleet with this update?",
  "Would love to compare this against the legacy Civic Type R telemetry.",
  "Can the digital twin replay align with the torque trace from cell 14?",
  "Can we bundle the acoustic maps for the Osaka listening room session?",
  "Any chance the welding co-pilot can export corrections back to Process Sim?",
  "Does the swarm routing respect AGV exclusion zones in the Marysville plant?",
  "Let's make sure the biomaterial supplier has PPAP data before we scale it.",
  "Do we have durability projections for the active aero actuators past 200k km?",
  "Nice! Does the OTA pipeline flag safety-critical events for the Nagoya team?",
  "Can we test the predictive HUD with the rain rig before Suzuka week?",
  "Would be great to expose these insights to the Hydrogen Council showcase.",
  "This should plug directly into the Proving Center of Europe dataset.",
  "What's the recycle content delta once we shift to the honeycomb process?",
  "Brilliant idea. Can we trial it on the Motegi EV endurance fleet next month?",
  "How chatty is the CAN traffic after adding those extra sensors?",
  "Is there an interface so dealer techs can read the coaching feedback offline?",
  "Have you aligned with purchasing on the new seaweed polymer sourcing?",
  "Could we visualize thermal hotspots in the VR telemetry playback as well?",
  "Let’s double-check compliance with the new global OTA retention policy.",
  "This might unblock the Tokyo hydrogen scooter demo we owe marketing.",
  "Would love a follow-up showing regen gains on a downhill Nürburgring run.",
  "The snow dataset clips look solid. Any gaps around heavy snowfall reflection?"
];

const REPLY_TEMPLATES = [
  "We'll schedule a Manitoba cold-soak to confirm.",
  "Great call—I'll sync with the Tochigi validators.",
  "Queueing that for the next proving ground session.",
  "I'll publish the raw CAN dump to the telemetry drive.",
  "Thanks! We'll fold that into the safety case notes.",
  "Appreciate it. Purchasing is already looping in the supplier.",
  "We can patch that into the Process Sim model next sprint.",
  "Good catch; adding a note for the OTA policy review.",
  "On it—will share the Nürburgring run once processed.",
  "We'll run that scenario on the rain rig tomorrow."
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserId(index: number): string {
  return `seed_user_${index.toString().padStart(3, "0")}`;
}

function generateUserName(): string {
  return `${randomElement(FIRST_NAMES)} ${randomElement(LAST_NAMES)}`;
}

function generateEmail(name: string, index: number): string {
  const cleanName = name.toLowerCase().replace(/\s+/g, ".");
  return `${cleanName}${index}@example.com`;
}

function generateAvatarUrl(): string {
  const avatars = [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=",
    "https://api.dicebear.com/7.x/personas/svg?seed=",
    "https://api.dicebear.com/7.x/initials/svg?seed=",
  ];
  const base = randomElement(avatars);
  const seed = Math.random().toString(36).substring(7);
  return base + seed;
}

function powerLawRandom(max: number, exponent: number = 2): number {
  return Math.floor(Math.pow(Math.random(), 1 / exponent) * max);
}

function generateComment(): string {
  return randomElement(COMMENT_TEMPLATES);
}

function generateReply(): string {
  return randomElement(REPLY_TEMPLATES);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildProjectPool(): Array<{
  name: string;
  summary: string;
  team: string;
  headline?: string;
  link: string;
}> {
  const result: Array<{
    name: string;
    summary: string;
    team: string;
    headline?: string;
    link: string;
  }> = [];
  let teamIndex = 0;

  for (const category of Object.values(PROJECT_CATEGORIES)) {
    for (let idx = 0; idx < category.names.length; idx++) {
      const name = category.names[idx];
      const summary = category.summaries[idx];
      const headline = category.headlines[idx];
      const team = TEAM_NAMES[teamIndex % TEAM_NAMES.length];
      teamIndex++;
      const slug = slugify(name);
      const linkOptions = [
        `https://intranet.honda/rnd/projects/${slug}`,
        `https://projects.honda-rnd.com/${slug}`,
        `https://docshare.honda/internal/${slug}`,
      ];

      result.push({
        name,
        summary,
        headline,
        team,
        link: randomElement(linkOptions),
      });
    }
  }

  return result;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Helper internal mutations for seeding
export const seedUser = internalMutation({
  args: {
    name: v.string(),
    externalId: v.string(),
    avatarUrlId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      name: args.name,
      externalId: args.externalId,
      avatarUrlId: args.avatarUrlId,
      email: args.email,
    });
  },
});

export const seedUpvote = internalMutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("upvotes", {
      projectId: args.projectId,
      userId: args.userId,
      createdAt: args.createdAt,
    });
  },
});

export const seedComment = internalMutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    content: v.string(),
    parentCommentId: v.optional(v.id("comments")),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("comments", {
      projectId: args.projectId,
      userId: args.userId,
      content: args.content,
      parentCommentId: args.parentCommentId,
      createdAt: args.createdAt,
      upvotes: 0,
    });
  },
});

export const seedCommentUpvote = internalMutation({
  args: {
    commentId: v.id("comments"),
    userId: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("commentUpvotes", {
      commentId: args.commentId,
      userId: args.userId,
      createdAt: args.createdAt,
    });
    
    const comment = await ctx.db.get(args.commentId);
    if (comment) {
      const currentUpvotes = comment.upvotes ?? 0;
      await ctx.db.patch(args.commentId, { upvotes: currentUpvotes + 1 });
    }
  },
});

export const seedDatabase = action({
  args: {},
  handler: async (ctx) => {
    console.log("Starting database seeding...");
    
    const NUM_USERS = 60;
    const NUM_PROJECTS = 20;
    const MIN_COMMENTS_PER_PROJECT = 3;
    const MAX_COMMENTS_PER_PROJECT = 12;
    const COMMENT_REPLY_PROBABILITY = 0.3;
    const UPVOTE_PROBABILITY = 0.4;
    const COMMENT_UPVOTE_PROBABILITY = 0.25;
    
    // Step 1: Create users
    console.log(`Creating ${NUM_USERS} users...`);
    const userIds: string[] = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const name = generateUserName();
      const externalId = generateUserId(i);
      const email = generateEmail(name, i);
      const avatarUrlId = generateAvatarUrl();
      
      await ctx.runMutation(internal.seed.seedUser, {
        name,
        externalId,
        avatarUrlId,
        email,
      });
      userIds.push(externalId);
    }
    console.log(`Created ${userIds.length} users`);
    
    // Step 2: Create projects (all active)
    const baseTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
    const curatedProjects = shuffleArray(buildProjectPool()).slice(0, NUM_PROJECTS);
    console.log(`Creating ${curatedProjects.length} projects...`);
    const projectIds: Id<"projects">[] = [];
    
    for (let i = 0; i < curatedProjects.length; i++) {
      const projectData = curatedProjects[i];
      const randomUserId = randomElement(userIds);
      
      // Create project as active directly
      const projectId = await ctx.runMutation(internal.projects.createProject, {
        name: projectData.name,
        summary: projectData.summary,
        team: projectData.team,
        status: "active" as const,
        userId: randomUserId,
        headline: projectData.headline,
        link: projectData.link,
      });
      
      projectIds.push(projectId);
      
      // Add RAG embedding
      const text = projectData.headline
        ? `${projectData.name}\n${projectData.headline}\n\n${projectData.summary}`
        : `${projectData.name}\n\n${projectData.summary}`;
      
      try {
        const { entryId } = await rag.add(ctx, {
          namespace: "projects",
          text,
          key: projectId,
        });
        
        await ctx.runMutation(internal.projects.updateEntryId, {
          projectId,
          entryId,
        });
      } catch (error) {
        console.warn(`Failed to add RAG embedding for project ${projectId}:`, error);
      }
      
      if ((i + 1) % 5 === 0 || i === curatedProjects.length - 1) {
        console.log(`Created ${i + 1} projects...`);
      }
    }
    console.log(`Created ${projectIds.length} projects`);
    
    // Step 3: Add upvotes (power law distribution)
    console.log("Adding upvotes...");
    let upvoteCount = 0;
    for (const projectId of projectIds) {
      // Some projects get many upvotes, most get few (power law)
      const numUpvotes = powerLawRandom(150, 2.5);
      
      // Select random users to upvote
      const upvotingUsers = new Set<string>();
      for (let i = 0; i < numUpvotes && upvotingUsers.size < userIds.length; i++) {
        upvotingUsers.add(randomElement(userIds));
      }
      
      const upvoteTime = baseTime + randomInt(0, 30 * 24 * 60 * 60 * 1000);
      
      for (const userId of upvotingUsers) {
        if (Math.random() < UPVOTE_PROBABILITY) {
          await ctx.runMutation(internal.seed.seedUpvote, {
            projectId,
            userId,
            createdAt: upvoteTime + randomInt(0, 10000),
          });
          upvoteCount++;
        }
      }
    }
    console.log(`Added ${upvoteCount} upvotes`);
    
    // Step 4: Add comments (with some nested replies)
    console.log("Adding comments...");
    let commentCount = 0;
    let replyCount = 0;
    const commentIds: Id<"comments">[] = [];
    
    for (const projectId of projectIds) {
      const numComments = randomInt(MIN_COMMENTS_PER_PROJECT, MAX_COMMENTS_PER_PROJECT);
      const commentTime = baseTime + randomInt(0, 30 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < numComments; i++) {
        const userId = randomElement(userIds);
        const content = generateComment();
        const createdAt = commentTime + (i * randomInt(1000, 5000));
        
        const commentId = await ctx.runMutation(internal.seed.seedComment, {
          projectId,
          userId,
          content,
          createdAt,
        });
        
        commentIds.push(commentId);
        commentCount++;
        
        // Some comments get replies
        if (Math.random() < COMMENT_REPLY_PROBABILITY) {
          const numReplies = randomInt(1, 3);
          for (let j = 0; j < numReplies; j++) {
            const replyUserId = randomElement(userIds);
            const replyContent = generateReply();
            const replyCreatedAt = createdAt + (j * randomInt(1000, 3000));
            
            const replyId = await ctx.runMutation(internal.seed.seedComment, {
              projectId,
              userId: replyUserId,
              content: replyContent,
              parentCommentId: commentId,
              createdAt: replyCreatedAt,
            });
            
            commentIds.push(replyId);
            replyCount++;
            
            // Some replies get nested replies (2 levels deep max)
            if (Math.random() < COMMENT_REPLY_PROBABILITY * 0.5) {
              const nestedUserId = randomElement(userIds);
              const nestedContent = generateReply();
              const nestedCreatedAt = replyCreatedAt + randomInt(1000, 2000);
              
              const nestedId = await ctx.runMutation(internal.seed.seedComment, {
                projectId,
                userId: nestedUserId,
                content: nestedContent,
                parentCommentId: replyId,
                createdAt: nestedCreatedAt,
              });
              
              commentIds.push(nestedId);
              replyCount++;
            }
          }
        }
      }
    }
    console.log(`Added ${commentCount} comments (${replyCount} replies)`);
    
    // Step 5: Add comment upvotes
    console.log("Adding comment upvotes...");
    let commentUpvoteCount = 0;
    
    for (const commentId of commentIds) {
      // Random number of upvotes per comment
      const numUpvotes = powerLawRandom(20, 2);
      const upvotingUsers = new Set<string>();
      
      for (let i = 0; i < numUpvotes && upvotingUsers.size < userIds.length; i++) {
        upvotingUsers.add(randomElement(userIds));
      }
      
      for (const userId of upvotingUsers) {
        if (Math.random() < COMMENT_UPVOTE_PROBABILITY) {
          await ctx.runMutation(internal.seed.seedCommentUpvote, {
            commentId,
            userId,
            createdAt: baseTime + randomInt(0, 30 * 24 * 60 * 60 * 1000),
          });
          commentUpvoteCount++;
        }
      }
    }
    console.log(`Added ${commentUpvoteCount} comment upvotes`);
    
    return {
      users: userIds.length,
      projects: projectIds.length,
      upvotes: upvoteCount,
      comments: commentCount,
      replies: replyCount,
      commentUpvotes: commentUpvoteCount,
      message: "Database seeding completed successfully!",
    };
  },
});

