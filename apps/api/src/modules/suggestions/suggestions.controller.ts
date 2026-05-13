import type { Request, Response } from "express";

import { ApiError } from "../../lib/http/api-error.js";
import type { CreateSuggestionBody, UpdateSuggestionStatusBody } from "./suggestions.validation.js";
import type { SuggestionsService } from "./suggestions.service.js";

type SuggestionsControllerDependencies = {
  service: SuggestionsService;
};

export function createSuggestionsController({ service }: SuggestionsControllerDependencies) {
  return {
    createSuggestion: async (request: Request, response: Response) => {
      const payload = request.body as CreateSuggestionBody;
      const suggestion = await service.createSuggestion(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: suggestion,
      });
    },

    listSuggestions: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          suggestions: await service.listSuggestions(),
        },
      });
    },

    updateSuggestionStatus: async (request: Request, response: Response) => {
      const suggestionId = request.params.id;

      if (!suggestionId || Array.isArray(suggestionId)) {
        throw new ApiError(400, "INVALID_SUGGESTION_ID", "Suggestion id is required.");
      }

      const payload = request.body as UpdateSuggestionStatusBody;
      const suggestion = await service.updateStatus(suggestionId, payload);

      response.status(200).json({
        success: true,
        data: suggestion,
      });
    },
  };
}
