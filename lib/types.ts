import { Id } from "@/convex/_generated/dataModel";

// --- Readiness ---

export type ReadinessStatus =
  | "in_progress"
  | "just_an_idea"
  | "early_prototype"
  | "mostly_working"
  | "ready_to_use";

// --- Users ---

export type UserRef = {
  _id: Id<"users">;
  name: string;
  avatarUrl: string;
};

// --- Focus Areas ---

export type FocusArea = {
  _id: Id<"focusAreas">;
  name: string;
  group: string | undefined;
  icon: string | undefined;
};

// --- Projects ---

export type ProjectRowData = {
  _id: Id<"projects">;
  _creationTime: number;
  lastVersionAt?: number;
  name: string;
  summary?: string;
  team?: string;
  upvotes: number;
  viewCount: number;
  commentCount: number;
  hasUpvoted: boolean;
  userId: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
  focusArea: FocusArea | null;
  additionalFocusAreas?: FocusArea[];
  readinessStatus?: ReadinessStatus;
  previewMedia: Array<{
    _id: string;
    storageId: string;
    type: string;
    url: string | null;
  }>;
  followerCount: number;
  followers: UserRef[];
  hasFollowed: boolean;
};

// --- Project Versions ---

export type ProjectVersionData = {
  _id: Id<"projectVersions">;
  projectId: Id<"projects">;
  tag: string;
  title: string;
  body?: string;
  creatorName: string;
  creatorAvatar: string;
  createdAt: number;
  fileCount: number;
};

// --- Threads ---

export type ThreadRowData = {
  _id: Id<"threads">;
  _creationTime: number;
  title: string;
  body?: string;
  upvoteCount: number;
  commentCount: number;
  hasUpvoted: boolean;
  userId: Id<"users">;
  creatorName: string;
  creatorAvatar: string;
  focusArea: FocusArea | null;
  createdAt: number;
};

// --- Chat ---

export type OptimisticMessage = {
  id: string;
  role: "user";
  content: string;
  timestamp: number;
};

// --- Links ---

export type LinkItem = {
  url: string;
  label: string;
};

// --- Files ---

export type ExistingFileItem = {
  _id: Id<"projectFiles">;
  filename: string;
  fileSize: number;
};

export type ExistingVersionFileItem = {
  _id: Id<"versionFiles">;
  filename: string;
  fileSize: number;
};

export type NewProjectFileItem = {
  file: File;
  id: string;
};

// --- Media ---

export type ExistingMediaItem = {
  _id: Id<"mediaFiles">;
  storageId: Id<"_storage">;
  type: string;
};

export type NewFileItem = {
  file: File;
  id: string;
};
