export type StoreStatus = "pianificato" | "in_apertura" | "aperto" | "chiuso";
export type TaskStatus = "da_fare" | "in_corso" | "fatto";

export interface Store {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  lat: number;
  lng: number;
  status: StoreStatus;
  opening_date: string | null;
  manager_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  store_id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  priority: 1 | 2 | 3;
  status: TaskStatus;
  assigned_to: string | null;
  completed_at: string | null;
  template_id?: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface TemplateItem {
  id: string;
  template_id: string;
  title: string;
  notes: string | null;
  priority: 1 | 2 | 3;
  offset_days: number | null;
  position: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  telegram_chat_id: string | null;
  notify_push: boolean;
  notify_email: boolean;
  notify_telegram: boolean;
  reminder_days_before: number;
}

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  pianificato: "Pianificato",
  in_apertura: "In apertura",
  aperto: "Aperto",
  chiuso: "Chiuso",
};

export const STORE_STATUS_COLOR: Record<StoreStatus, string> = {
  pianificato: "#64748b",
  in_apertura: "#f59e0b",
  aperto: "#16a34a",
  chiuso: "#dc2626",
};

export const PRIORITY_LABEL: Record<number, string> = { 1: "Alta", 2: "Media", 3: "Bassa" };
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  da_fare: "Da fare",
  in_corso: "In corso",
  fatto: "Fatto",
};
