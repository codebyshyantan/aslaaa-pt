import { apiRequest } from "@/lib/http-client";

import type { UserRole } from "@/features/auth/auth.types";

export const suggestionStatusOptions = ["PENDING", "UNDER_REVIEW", "IMPLEMENTED", "REJECTED"] as const;
export type SuggestionStatus = (typeof suggestionStatusOptions)[number];

export interface SuggestionRecord {
  createdAt: string;
  description: string;
  id: string;
  status: SuggestionStatus;
  submittedByRole: UserRole;
  submittedByUserId: string;
  submittedByUsername: string;
  title: string;
}

export function fetchSuggestions() {
  return apiRequest<{ suggestions: SuggestionRecord[] }>("/suggestions", {
    method: "GET",
  });
}

export function createSuggestion(payload: { description: string; title: string }) {
  return apiRequest<SuggestionRecord>("/suggestions", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function updateSuggestionStatus(id: string, status: SuggestionStatus) {
  return apiRequest<SuggestionRecord>(`/suggestions/${id}/status`, {
    body: JSON.stringify({ status }),
    method: "PATCH",
  });
}
