import { salonApiFetch } from "./salonApiClient";

/** A booking's chat between the customer and the salon (apps/api appointment-chat). */
export interface ChatMessage {
  id: string;
  side: "CUSTOMER" | "SALON";
  senderName: string;
  text: string;
  at: string;
  mine: boolean;
}
export interface AppointmentChat {
  side: "CUSTOMER" | "SALON";
  /** Writing is open until 24 h after the booking's end, and never once it's cancelled. */
  canWrite: boolean;
  /** The other side has read up to here (✓✓). */
  otherReadAt: string | null;
  messages: ChatMessage[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export const getAppointmentChat = (token: string, id: string) => salonApiFetch<AppointmentChat>(`/appointments/${id}/messages`, { headers: auth(token) });

export const sendAppointmentMessage = (token: string, id: string, text: string) =>
  salonApiFetch<ChatMessage>(`/appointments/${id}/messages`, { method: "POST", headers: auth(token), body: JSON.stringify({ text }) });

export const markAppointmentChatRead = (token: string, id: string) =>
  salonApiFetch<{ ok: true }>(`/appointments/${id}/messages/read`, { method: "POST", headers: auth(token) });

/** Unread messages per booking id (the caller's side), for the badges on booking lists. */
export const getUnreadChats = (token: string) => salonApiFetch<Record<string, number>>("/appointments/chats/unread", { headers: auth(token) });
