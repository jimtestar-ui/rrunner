export type TrafficColor = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

export type TrafficStatus =
  | "IDLE"
  | "LOADING"
  | "READY"
  | "STALE"
  | "UNKNOWN"
  | "USER_ACTION_REQUIRED"
  | "ERROR";

export type PlanType = "FREE" | "PRO";

export type BetaTesterStatus = "INVITED" | "ACTIVE";

export type TrafficDataSource = "REAL" | "DEMO" | "UNKNOWN";

export interface Driver_Location {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
}

export interface Traffic_Threshold {
  greenMaxMinutes: number;
  redOverMinutes: number;
}

export interface Congestion_Segment {
  label: "NORMAL" | "SLOW" | "JAM";
  startOffsetMeters: number;
  endOffsetMeters: number;
}

export interface Destination {
  id: string;
  accountDestinationId?: string;
  name: string;
  address: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  nickname: string;
  cardColor: string;
  isPriority: boolean;
  status: TrafficStatus;
  trafficColor: TrafficColor;
  delayMinutes: number | null;
  etaMinutes: number | null;
  normalMinutes: number | null;
  alternateRouteExists: boolean | null;
  congestionSegments: Congestion_Segment[];
  lastKnownGood?: Omit<Destination, "lastKnownGood">;
  warning?: string;
  updatedAt?: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface TrafficCheckLog {
  id: string;
  destinationId: string;
  destinationName: string;
  checkedAt: string;
  normalMinutes: number | null;
  etaMinutes: number | null;
  delayMinutes: number | null;
  trafficColor: TrafficColor;
  comparisonNote?: string;
}

export interface Plan {
  type: PlanType;
  locationLimit: number;
}

export interface AppState {
  Driver_Location: Driver_Location | null;
  Traffic_Threshold: Traffic_Threshold;
  destinations: Destination[];
  destinationAccountUserId?: string | null;
  plan: Plan;
  betaTesters: BetaTester[];
  trafficCheckLogs: TrafficCheckLog[];
  trafficServiceUrl: string;
  trafficDataSource: TrafficDataSource;
  wittyModeEnabled: boolean;
  refreshStatus: TrafficStatus;
  lastRefreshAt?: string;
  errorMessage?: string;
}

export interface BetaTester {
  id: string;
  email: string;
  planType: PlanType;
  status: BetaTesterStatus;
  addedAt: string;
}

export interface Traffic_Service_Result {
  destinationId: string;
  etaMinutes: number;
  normalMinutes: number;
  delayMinutes: number;
  alternateRouteExists: boolean;
  congestionSegments?: Congestion_Segment[];
  hasSpeedReadingIntervals: boolean;
}
