import { PrismaAdapter } from "@grammyjs/storage-prisma";
import {
	type Middleware,
	type SessionOptions,
	session as createSession,
} from "grammy";
import type { Context } from "#root/bot/context.js";
import defaultApps from "#root/bot/features/launcher/apps/default.json";
import { PrismaClient } from "#root/generated/client/index.js";

export type MiniApp = {
	title: string;
	link: string;
	description?: string;
};
export type SessionData = {
	apps: MiniApp[];
	homePage: number;
	addPage: number;
	removePage: number;
};
type Options = Pick<
	SessionOptions<SessionData, Context>,
	"getSessionKey" | "storage"
>;

const prisma = new PrismaClient();

export function session(options: Options): Middleware<Context> {
	return createSession({
		getSessionKey: options.getSessionKey,
		storage: new PrismaAdapter(prisma.session),
		initial: () => ({
			apps: defaultApps,
			homePage: 1,
			addPage: 1,
			removePage: 1,
			conversation: {},
		}),
	});
}
