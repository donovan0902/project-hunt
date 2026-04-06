import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Refresh hot scores every hour to handle time decay
crons.interval(
  "refresh hot scores",
  { hours: 1 },
  internal.projects.refreshHotScores
);

// Generate weekly digests every Friday at 12:00 PM EST (17:00 UTC)
crons.weekly(
  "generate weekly digests",
  { dayOfWeek: "friday", hourUTC: 17, minuteUTC: 0 },
  internal.digests.generateWeeklyDigests
);

// Drain pending emails from the queue every 5 minutes
crons.interval(
  "drain email queue",
  { minutes: 5 },
  internal.emails.drainEmailQueue
);

// Recompute all user affinities + personalized feed entries every 6 hours
crons.interval(
  "refresh user affinities and feeds",
  { hours: 6 },
  internal.userAffinities.refreshAllFeeds
);

export default crons;
