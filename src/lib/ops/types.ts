export type SystemKind = "monocouche" | "silicone" | "ewi" | "cork" | "plaster";
export type Region = "Leeds" | "Harrogate" | "York";
export type StageStatus = "verified" | "upload" | "locked";
export type Review = "pending" | "approved" | "rejected";
export type Role = "agency" | "boss" | "lead";

export interface StageDef {
  code: string;
  name: string;
  short: string;
  /** Finishing coat that rain or cold can ruin. */
  weatherSensitive: boolean;
  /** Prep work a crew can safely do in the rain. */
  prep: boolean;
}

export interface Stage {
  code: string;
  status: StageStatus;
  photo?: string;
  uploadedAt?: string;
  review?: Review;
}

export interface Elevation {
  name: string;
  area: number;
  stages: Stage[];
  defect?: string;
}

export interface Job {
  id: string;
  ref: string;
  address: string;
  postcode: string;
  region: Region;
  customer: string;
  system: SystemKind;
  product: string;
  coords: { x: number; y: number };
  elevations: Elevation[];
  quoted: number;
  materialCost: number;
  scaffoldCost: number;
  scaffold: { hireDays: number; daysUsed: number; weeklyFee: number; struck?: boolean; required?: boolean };
  /** Man-days logged at shift close-out (men on site × days). */
  manDays?: number;
  /** Material quantities logged by the site lead, keyed by price-book item. */
  usage?: Record<string, number>;
  menOnSite: number;
  bags: number;
  batches: string[];
  daysWorked: number;
  crewId?: string;
  status: "intake" | "active" | "complete";
  source: "ghl" | "manual";
  ghlOpportunityId?: string;
  createdAt: string;
  completedAt?: string;
  warrantyExported?: boolean;
  reviewRequested?: boolean;
  topcoatStopped?: boolean;
  /** How many men the work actually needs (e.g. 1 for a single-room skim). */
  menNeeded?: number;
}

export interface VariationItem {
  name: string;
  qty: string;
}

export interface Variation {
  id: string;
  number: string;
  jobId: string;
  elevation: string;
  headline: string;
  title: string;
  description: string;
  photos: { src: string; at: string }[];
  items: VariationItem[];
  cost: number;
  siteDays: number;
  scaffoldDays: number;
  homeowner: string;
  status: "pending" | "signed";
  signature?: string;
  signedAt?: string;
}

export interface Crew {
  id: string;
  name: string;
  lead: string;
  men: number;
  skills: string[];
  specialty: string;
  certs: string;
  dayRate: number;
  base: { x: number; y: number };
  phone: string;
  /** Individual workers in this team; when set, men/day rate/skills come from them. */
  memberIds?: string[];
  /** Team lead who drives the van — the team travels with them. */
  driverId?: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  postcode: string;
  dayRate: number;
  skills: SystemKind[];
  /** Can get to a different site on their own (not tied to the team van). */
  ownTransport: boolean;
  base: { x: number; y: number };
}

export interface ReminderLog {
  id: string;
  at: string;
  workerId: string;
  phone: string;
  message: string;
  status: "queued" | "sent" | "failed";
}

export type BookingKind = "work" | "hold" | "gap" | "depot" | "new";

export interface Booking {
  id: string;
  crewId: string;
  start: number;
  len: number;
  kind: BookingKind;
  label: string;
  jobId?: string;
  stageCode?: string;
}

export interface DayWeather {
  rain: number;
  temp: number;
  note?: string;
}

export interface WebhookLog {
  id: string;
  at: string;
  status: number;
  message: string;
  jobId?: string;
}

export interface TenantData {
  jobs: Job[];
  variations: Variation[];
  crews: Crew[];
  bookings: Booking[];
  forecast: Record<Region, DayWeather[]>;
  rainOverrides: number[];
  webhookLog: WebhookLog[];
  materialOverrides?: MaterialOverrides;
  workers?: Worker[];
  reminderLog?: ReminderLog[];
}

export interface MaterialItem {
  id: string;
  name: string;
  unit: string;
  supplier: string;
  price: number;
  system: SystemKind | "all";
  overridden?: boolean;
}

export type MaterialOverrides = Record<string, { supplier: string; price: number }>;

export interface Tenant {
  id: string;
  name: string;
  ghlLocationId: string;
  homeRegion: Region;
  gpFloor: number;
  defaultDayRate: number;
  createdAt: string;
}

export interface OpsState {
  role: Role;
  activeTenantId: string;
  tenants: Tenant[];
  data: Record<string, TenantData>;
  agencyMaterials: MaterialItem[];
  /** Which worker is signed in on the site view (testing stand-in for login). */
  activeWorkerId?: string;
}
