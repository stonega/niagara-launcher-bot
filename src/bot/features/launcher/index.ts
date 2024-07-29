import { conversations, createConversation } from "@grammyjs/conversations";
import { Menu, MenuRange } from "@grammyjs/menu";
import { Composer } from "grammy";
import { z } from "zod";
import type { Context, ConversationContext } from "../../context.js";
import type { MiniApp } from "../../middlewares/session.js";
import customApps from "./apps/custom.json";
import tapps from "./apps/tapps.json";

const allAppsFromJson = [...customApps, ...tapps];
const allApps = Array.from(new Set(allAppsFromJson.map((app) => app.link))).map(
	(link) => allAppsFromJson.find((app) => app.link === link)!,
);
const composer = new Composer<Context>();
const launcher = composer.chatType("private");

const settinsMenu = new Menu<Context>("launcher-settings")
	.text("REMOVE ➖", (ctx) => {
		ctx.deleteMessage();
		ctx.reply("Tap the app to remove it. You can re-add it later if needed.", {
			reply_markup: removeMenu,
		});
	})
	.text("ADD ➕", (ctx) => {
		ctx.deleteMessage();
		ctx.reply("Tap an app to add it. For custom apps, use the /add command.", {
			reply_markup: addMenu,
		});
	})
	.row()
	.back("Go Back");

const removeMenu = new Menu<Context>("launcher-remove")
	.dynamic((ctx: Context) => {
		const range = new MenuRange<Context>();
		const apps = ctx.session.apps;
		apps.forEach((app, i) => {
			range.text(`➖ ${app.title}`, (ctx) => {
				ctx.session.apps = apps.filter((a) => a.link !== app.link);
				ctx.editMessageText(
					`${app.title} is removed successfully 🎉  go /home`,
				);
			});
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		range.row().text("Confirm", (ctx) => {
			ctx.deleteMessage();
			ctx.reply("Update successfully 🎉  go /home");
		});
		return range;
	})
	.row();

const addMenu = new Menu<Context>("launcher-add")
	.dynamic((ctx: Context) => {
		const range = new MenuRange<Context>();
		const userApps = ctx.session.apps;
		const apps: MiniApp[] = allApps.filter(
			(app) => !userApps.find((a) => a.link === app.link),
		);
		apps.forEach((app, i) => {
			range.text(`➕${app.title}`, (ctx) => {
				ctx.session.apps = [...userApps, app];
				ctx.editMessageText(`${app.title} is added successfully 🎉  go /home`);
			});
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		range.row().text("Confirm", (ctx) => {
			ctx.deleteMessage();
			ctx.reply("Update successfully 🎉  go /home");
		});
		return range;
	})
	.row();

const menu = new Menu<Context>("launcher")
	.dynamic(async (ctx) => {
		const range = new MenuRange<Context>();
		const apps = ctx.session.apps;
		apps.forEach((app, i) => {
			range.url(`${app.title}`, app.link);
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		return range;
	})
	.row()
	.submenu("Settings 🛠️", "launcher-settings");

menu.register(settinsMenu);

async function addApp(conversation: ConversationContext, ctx: Context) {
	await ctx.reply(`OK. Send me a list of commands for your bot. Please use this format:<br/>MiniApp1 - https://t.me/bot1/join
<br/>MiniApp2 - https://t.me/bot2/join<br/>.`);
	const { message } = await conversation.wait();
	const text = message?.text;
	if (!text) {
		await ctx.conversation?.exit();
		return;
	}
	const apps = text.split("\n").map((line) => ({
		title: line.split(" - ")[0],
		link: line.split(" - ")[1],
	}));
	const appsScheme = z.array(
		z.object({
			title: z.string().min(1),
			link: z.string().url(),
		}),
	);
	try {
		const parsedApps = appsScheme.parse(apps);
		conversation.session.apps = [...conversation.session.apps, ...parsedApps];
		await ctx.reply("App added successfully 🎉  go /home");
	} catch (e) {
		await ctx.reply("Sorry, the list of apps is invalid., try /add again");
	} finally {
		await ctx.conversation?.exit();
	}
}

launcher.use(conversations());
launcher.errorBoundary(
	(err) => console.error("Conversation threw an error!", err),
	createConversation(addApp),
);
launcher.use(removeMenu);
launcher.use(addMenu);
launcher.use(menu);

launcher.command("add", async (ctx) => {
	await ctx.conversation.enter("addApp");
});

launcher.command("home", (ctx) => {
	ctx.reply(
		"Niagata Launcher: Instantly access and launch your favorite apps",
		{ reply_markup: menu },
	);
});

export { composer as launcherFeature };
