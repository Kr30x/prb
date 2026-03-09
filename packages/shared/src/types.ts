import { Timestamp } from "firebase-admin/firestore";

export interface Author {
  name: string;
  role: string;
  type: "deputy" | "senator" | "government" | "other";
}

export interface Document {
  type: string;
  url: string;
  name: string;
}

export interface LastEvent {
  stage: string;
  date: Timestamp | Date | string;
}

export interface BillEvent {
  date: string;
  eventNum: string;
  name: string;
  documents?: Document[];
}

export interface Bill {
  id: string;
  title: string;
  lawForm?: string;
  registrationDate: Timestamp | Date | string;
  status: string;
  lastEvent: LastEvent;
  authors: Author[];
  committees: string[];
  convocation: number;
  url: string;
  documents: Document[];
  events?: BillEvent[];
  scrapedAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

export interface AffectedLaw {
  name: string;
  articles: string[];
  description: string;
}

export interface BillAnalysis {
  billId: string;
  summary: string;
  keyChanges: string[];
  affectedLaws: AffectedLaw[];
  importance: number;        // 1–5 stars
  importanceReason: string;  // one-sentence explanation
  rawText: string;
  pdfUrl: string;
  aiModel: string;
  analyzedAt: Timestamp | Date | string;
  status: "pending" | "done" | "failed";
}

export interface BillListItem {
  id: string;
  title: string;
  registrationDate: string;
  status: string;
  url: string;
}

export interface BillFilters {
  search?: string;
  status?: string;
  authorType?: "deputy" | "senator" | "government" | "other";
  convocation?: number;
  committee?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Telegram bot subscriptions
export interface TgSubscription {
  chatId: number;
  userId: number;
  username?: string;
  billIds: string[];       // subscribed bill IDs
  authorNames: string[];   // subscribed author names
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// Used by scraper to record status changes for notifications
export interface StatusChange {
  billId: string;
  billTitle: string;
  oldStatus: string;
  newStatus: string;
  changedAt: Timestamp | Date | string;
}
