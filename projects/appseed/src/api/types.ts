import type { SocialLinks } from "@/lib/socialLinks";
import type { VerifySource } from "@/lib/transfer";
import type { LicenseKind } from "@/lib/license";
import type { TemplateStatus } from "@/lib/status";

export type CategoryKey = "tools" | "finance" | "ai" | "games" | "hk" | "merchant";
export type Platform = "iOS" | "Android" | "Web";
export type CoverIcon = "wallet" | "building" | "chef" | "grid" | "ticket" | "sprout" | "bus" | "receipt" | "sparkles" | "code" | "chat" | "camera" | "rocket" | "game" | "megaphone" | "hammer" | "globe";

export type Creator = {
  handle: string;
  name: string;
  bio: string;
  avatarHue: number;
  founding: boolean;
  totalSales: number;
  avgRating: number;
  /** Stored as bare handles (website as an https URL); see lib/socialLinks.ts. */
  links?: SocialLinks;
};

export type StoryStep = {
  title: string;
  body: string;
  prompt?: { tool: string; text: string };
  pitfall?: string;
};

export type FileNode = { name: string; size?: number; children?: FileNode[] };

export type Review = {
  id: string;
  author: string;
  rating: number;
  date: string;
  body: string;
  reply?: string;
};

export type Version = { version: string; date: string; notes: string };

export type Template = {
  slug: string;
  name: string;
  tagline: string;
  category: CategoryKey;
  creator: string;
  price: number;
  currency: "HKD";
  rating: number;
  reviewCount: number;
  sales: number;
  updatedAt: string;
  createdAt: string;
  stack: string[];
  platforms: Platform[];
  license: LicenseKind;
  cover: { from: string; to: string; icon: CoverIcon };
  screens: number;
  features: string[];
  forWho: string;
  requirements: string[];
  story: StoryStep[];
  freePreviewSteps: number;
  files: FileNode[];
  readme: string;
  reviews: Review[];
  versions: Version[];
  featured?: boolean;
};

export type Listing = { slug: string; status: TemplateStatus; monthSales: number; monthRevenue: number };

/** Prompt marketplace listing. `text` is only sent to owners by the real server. */
export type PromptListing = {
  slug: string;
  title: string;
  summary: string;
  tool: string;
  category: CategoryKey;
  creator: string;
  price: number;
  rating: number;
  reviewCount: number;
  sales: number;
  updatedAt: string;
  previewLines: number;
  /** Full line count, sent by the server even when `text` is redacted. */
  lineCount?: number;
  text: string;
  sampleOutput: string[];
  tags: string[];
  cover: { from: string; to: string; icon: CoverIcon };
};

/** Whole-app buyout listing (business transfer via escrow, not IAP). */
export type BuyoutListing = {
  slug: string;
  name: string;
  tagline: string;
  seller: string;
  category: CategoryKey;
  asking: number;
  monthlyRevenue: number;
  monthlyActive: number;
  downloads: number;
  rating: number;
  ageMonths: number;
  stack: string[];
  platforms: Platform[];
  included: string[];
  reason: string;
  status: "open" | "negotiating" | "sold";
  offers: number;
  revenueSeries: number[];
  cover: { from: string; to: string; icon: CoverIcon };
  /** Read-only sources the revenue was checked against; empty = unverified (§22.2). */
  verifiedVia: VerifySource[];
  /** Store transfer facts that shape the hand-over checklist. */
  transfer: { signInWithApple: boolean; playAppSigning: boolean; domain: boolean; social: boolean };
};

/** "新作推廣": a vibe-coded app its maker is promoting. */
export type Launch = {
  slug: string;
  name: string;
  tagline: string;
  maker: string;
  aiTools: string[];
  buildDays: number;
  platforms: Platform[];
  upvotes: number;
  comments: number;
  launchedAt: string;
  boosted: boolean;
  /** Ranking signals (§28); the server aggregates them from raw votes, shares and reports. */
  shares: number;
  trustedShare: number;
  newAccountShare: number;
  reports: number;
  story: string;
  links: { label: string; url: string }[];
  relatedTemplate?: string;
  relatedPrompt?: string;
  cover: { from: string; to: string; icon: CoverIcon };
};

export type Offer = { slug: string; amount: number; message: string; createdAt: string; status: "sent" | "countered" | "accepted" };

export type GithubRepo = { fullName: string; private: boolean; language: string; updatedAt: string; defaultBranch: string; branches: string[] };

export type ScanReport = { checks: import("@/lib/sourceScan").Check[]; stack: string[]; files: FileNode[]; fileCount: number; sizeBytes: number };

/** Where a listing's source code comes from. Serializable so it lives in the auto-saved draft. */
export type SourceChoice =
  | { kind: "github"; repo: string; branch: string; report: ScanReport | null }
  | { kind: "zip"; fileName: string | null; report: ScanReport | null };

export type User = {
  id: string;
  name: string;
  handle: string;
  email: string | null;
  provider: import("@/lib/auth").AuthProvider;
  createdAt: string;
};

/** Sign-in either lands a known user, or hands back a ticket to finish a new account's profile. */
export type AuthResult = { status: "signedIn"; user: User } | { status: "needsProfile"; ticket: string; email: string | null; name: string };

/** Public counters for any item plus the viewer's own like. Bookmark state lives in favourites. */
export type Engagement = { likes: number; views: number; shares: number; comments: number; bookmarks: number; liked: boolean };

/** A discussion post (§27). Top-level posts may attach one app to promote; replies never do. */
export type PostAttachment = { kind: "template" | "prompt" | "buyout" | "launch"; slug: string };
export type Post = {
  id: string;
  userId: string;
  author: string;
  handle: string;
  body: string;
  createdAt: string;
  attachment?: PostAttachment;
  /** The attached app belongs to the author: shown as 作者作品 so promotion is always disclosed. */
  promo?: boolean;
  parentId?: string;
  likes: number;
  replies: number;
  reposts: number;
  liked?: boolean;
  reposted?: boolean;
};

export type Comment = { id: string; userId: string; author: string; handle: string; body: string; createdAt: string };
