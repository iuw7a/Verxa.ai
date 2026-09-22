export type Role = "user" | "assistant" | "system";

export type Source = {
  title: string;
  url: string;
  snippet?: string;
};

export type IntegrationDataAttachment = {
  provider: string;
  tool: string;
  data: unknown; // tool-specific payload (email list, events, files …)
};

export type ConnectPromptAttachment = {
  provider: string;
  reason?: string;
  message?: string;
};

export type MediaAttachment = {
  kind: "image" | "video";
  url?: string; // set when generation finished
  prompt: string;
  state: "generating" | "done" | "error";
  error?: string;
  /** User-selected video generation options (composer panel). */
  videoOptions?: {
    model: "agnes-video-2.5-flash" | "agnes-video-v2.0";
    seconds: number;
    aspectRatio: string;
  };
};

export type Message = {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  searchUnavailable?: boolean;
  flights?: FlightsAttachment;
  integrationData?: IntegrationDataAttachment;
  connectPrompt?: ConnectPromptAttachment;
  integrationError?: string;
  media?: MediaAttachment;
  createdAt: number;
};

export type FlightSegment = {
  airlineCode: string;
  airlineName: string;
  airlineLogo?: string;
  flightNumber: string;
  fromIata: string;
  fromCity?: string;
  toIata: string;
  toCity?: string;
  departAt: string;
  arriveAt: string;
  durationMinutes?: number;
  aircraft?: string;
  cabinClass?: string;
};

export type FlightOffer = {
  id: string;
  price: number;
  currency: string;
  outbound: FlightSegment[];
  inbound?: FlightSegment[];
  bookingUrl: string;
};

export type FlightsAttachment = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  passengers: number;
  cabin: string;
  provider: string;
  dataSource: string;
  offers: FlightOffer[];
};

export type Chat = {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type MemoryItem = {
  id: string;
  content: string;
  enabled: boolean;
  createdAt: number;
};

export type Profile = {
  displayName: string;
  username: string;
  email: string;
  emailVerified: boolean;
  bio: string;
  location: string;
  avatarUrl: string;
};

export type AccountSettings = {
  language: string;
  theme: "system" | "light" | "dark";
  notifications: {
    product: boolean;
    security: boolean;
    marketing: boolean;
  };
  emailNotifications: {
    weeklySummary: boolean;
    chatDigest: boolean;
    billing: boolean;
  };
};

export type SecurityState = {
  twoFactorEnabled: boolean;
};

export type Personalization = {
  customInstructions: string;
  tone: "professional" | "friendly" | "direct" | "casual";
  responseLength: "short" | "medium" | "long";
  personality: {
    witty: boolean;
    concise: boolean;
    curious: boolean;
    formal: boolean;
  };
};

export type ConnectedApp = {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  permissions: string[];
};

export type SessionRecord = {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current?: boolean;
};

export type LoginEvent = {
  id: string;
  when: string;
  ip: string;
  status: "success" | "failed";
};
