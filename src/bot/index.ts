import { autoChatAction } from "@grammyjs/auto-chat-action";
import { hydrate } from "@grammyjs/hydrate";
import { hydrateReply, parseMode } from "@grammyjs/parse-mode";
import { sequentialize } from "@grammyjs/runner";
import type { BotConfig, StorageAdapter } from "grammy";
import { Bot as TelegramBot } from "grammy";
import type { Context } from "#root/bot/context.js";
import { createContextConstructor } from "#root/bot/context.js";
import { i18n, isMultipleLocales } from "#root/bot/i18n.js";
import type { Config } from "#root/config.js";
import type { Logger } from "#root/logger.js";
import { adminFeature } from "./features/admin.js";
import { languageFeature } from "./features/language.js";
import { launcherFeature } from "./features/launcher/index.js";
import { unhandledFeature } from "./features/unhandled.js";
import { welcomeFeature } from "./features/welcome.js";
import { errorHandler } from "./handlers/error.js";
import { type SessionData, session } from "./middlewares/session.js";
import { updateLogger } from "./middlewares/update-logger.js";

interface Dependencies {
	config: Config;
	logger: Logger;
}

interface Options {
	botSessionStorage?: StorageAdapter<SessionData>;
	botConfig?: Omit<BotConfig<Context>, "ContextConstructor">;
}

function getSessionKey(ctx: Omit<Context, "session">) {
	return ctx.chat?.id.toString();
}

export function createBot(
	token: string,
	dependencies: Dependencies,
	options: Options = {},
) {
	const { config, logger } = dependencies;

	const bot = new TelegramBot(token, {
		...options.botConfig,
		ContextConstructor: createContextConstructor({
			logger,
			config,
		}),
	});
	const protectedBot = bot.errorBoundary(errorHandler);

	// Middlewares
	bot.api.config.use(parseMode("HTML"));

	config.isPollingMode && protectedBot.use(sequentialize(getSessionKey));
	config.isDebug && protectedBot.use(updateLogger());
	protectedBot.use(autoChatAction(bot.api));
	protectedBot.use(hydrateReply);
	protectedBot.use(hydrate());
	protectedBot.use(
		session({ getSessionKey, storage: options.botSessionStorage }),
	);
	protectedBot.use(i18n);

	// Handlers
	protectedBot.use(welcomeFeature);
	protectedBot.use(adminFeature);
	isMultipleLocales && protectedBot.use(languageFeature);
	protectedBot.use(launcherFeature);

	// must be the last handler
	protectedBot.use(unhandledFeature);

	return bot;
}

export type Bot = ReturnType<typeof createBot>;
