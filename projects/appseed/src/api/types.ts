import type { LicenseKind } from "@/lib/license";
import type { TemplateStatus } from "@/lib/status";

export type CategoryKey = "tools" | "finance" | "ai" | "games" | "hk" | "merchant";
export type Platform = "iOS" | "Android" | "Web";
export type CoverIcon = "wallet" | "building" | "chef" | "grid" | "ticket" | "sprout" | "bus" | "receipt";

export type Creator = {
  handle: string;
  name: string;
  bio: string;
  avatarHue: number;
  founding: boolean;
  totalSales: number;
  avgRating: number;
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
