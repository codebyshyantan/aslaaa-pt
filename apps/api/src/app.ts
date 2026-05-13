import { randomUUID } from "node:crypto";

import type { Request } from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env as runtimeEnv, type AppEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createActivityController } from "./modules/activity/activity.controller.js";
import { createActivityRouter } from "./modules/activity/activity.routes.js";
import { ActivityService } from "./modules/activity/activity.service.js";
import { createAchievementsController } from "./modules/achievements/achievements.controller.js";
import { createAchievementsRouter } from "./modules/achievements/achievements.routes.js";
import { AchievementsService } from "./modules/achievements/achievements.service.js";
import { createAuthController } from "./modules/auth/auth.controller.js";
import { createAuthMiddleware } from "./modules/auth/auth.middleware.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { createAutomationController } from "./modules/automation/automation.controller.js";
import { createAutomationRouter } from "./modules/automation/automation.routes.js";
import { AutomationService } from "./modules/automation/automation.service.js";
import { createScrimsController } from "./modules/scrims/scrims.controller.js";
import { createScrimsRouter } from "./modules/scrims/scrims.routes.js";
import { ScrimsService } from "./modules/scrims/scrims.service.js";
import { createSuggestionsController } from "./modules/suggestions/suggestions.controller.js";
import { createSuggestionsRouter } from "./modules/suggestions/suggestions.routes.js";
import { SuggestionsService } from "./modules/suggestions/suggestions.service.js";
import { createTeamsController } from "./modules/teams/teams.controller.js";
import { createTeamsRouter } from "./modules/teams/teams.routes.js";
import { TeamsService } from "./modules/teams/teams.service.js";
import { createUsersController } from "./modules/users/users.controller.js";
import { createUsersRouter } from "./modules/users/users.routes.js";
import { UsersService } from "./modules/users/users.service.js";
import { createAppRepositories, type AppRepositories } from "./persistence/app-repositories.js";
import { apiRouter } from "./routes/index.js";

type AppDependencies = {
  authService: AuthService;
  env: AppEnv;
  repositories: AppRepositories;
};

export async function createApp(overrides: Partial<AppDependencies> = {}) {
  const activeEnv = overrides.env ?? runtimeEnv;
  const repositories = overrides.repositories ?? (await createAppRepositories(activeEnv));
  const authService =
    overrides.authService ?? (await AuthService.create({ env: activeEnv, repository: repositories.auth }));
  const activityService = ActivityService.create({ repository: repositories.activity });
  const achievementsService = AchievementsService.create({ repository: repositories.achievements });
  const scrimsService = ScrimsService.create({
    getPointSystemSettings: () => repositories.automation.getPointSystemSettings(),
    recordActivity: (input) => repositories.activity.create(input),
    repository: repositories.scrims,
  });
  const automationService = AutomationService.create({
    recordActivity: (input) => repositories.activity.create(input),
    recordAutomaticAchievement: (actor, title, description) =>
      achievementsService.recordAutomaticAchievement(actor, title, description),
    repository: repositories.automation,
    scrimsRepository: repositories.scrims,
  });
  const suggestionsService = SuggestionsService.create({ repository: repositories.suggestions });
  const teamsService = TeamsService.create({
    recordActivity: (input) => repositories.activity.create(input),
    repository: repositories.teams,
  });
  const usersService = UsersService.create({ repository: repositories.auth });
  const achievementsController = createAchievementsController({ service: achievementsService });
  const activityController = createActivityController({ service: activityService });
  const authController = createAuthController({ authService, env: activeEnv });
  const authMiddleware = createAuthMiddleware({ authService, env: activeEnv });
  const automationController = createAutomationController({ service: automationService });
  const scrimsController = createScrimsController({ service: scrimsService });
  const suggestionsController = createSuggestionsController({ service: suggestionsService });
  const teamsController = createTeamsController({ service: teamsService });
  const usersController = createUsersController({ service: usersService });
  const app = express();

  app.set("trust proxy", 1);
  morgan.token("request-id", (request) => (request as Request).requestId ?? "-");

  app.use((request, response, next) => {
    const requestId = request.get("x-request-id")?.trim() || randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  });
  app.use(
    cors({
      origin: activeEnv.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    morgan(
      activeEnv.NODE_ENV === "production"
        ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" request_id=:request-id'
        : ":method :url :status :response-time ms request_id=:request-id",
    ),
  );

  app.get("/", (_request, response) => {
    response.status(200).json({
      app: "aslaaa-pt-api",
      message: "Aslaaa PT backend is online for ASLAAA ESPORTS",
    });
  });

  app.use(
    "/api/activity-logs",
    createActivityRouter({
      controller: activityController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/auth",
    createAuthRouter({
      controller: authController,
      env: activeEnv,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/teams",
    createTeamsRouter({
      controller: teamsController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/suggestions",
    createSuggestionsRouter({
      controller: suggestionsController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/achievements",
    createAchievementsRouter({
      controller: achievementsController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/auto-merge",
    createAutomationRouter({
      controller: automationController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/scrims",
    createScrimsRouter({
      controller: scrimsController,
      middleware: authMiddleware,
    }),
  );
  app.use(
    "/api/users",
    createUsersRouter({
      controller: usersController,
      middleware: authMiddleware,
    }),
  );
  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  app.locals.shutdown = repositories.dispose;
  app.locals.runScheduledAutomation = () => automationService.runDueConfigs();

  return app;
}
