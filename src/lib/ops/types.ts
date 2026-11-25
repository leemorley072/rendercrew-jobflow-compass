export type SystemKind = "monocouche" | "silicone";
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
  scaffold: { hireDays: number; daysUsed: number; weeklyFee: number; struck?: boolean };
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
}

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
}
