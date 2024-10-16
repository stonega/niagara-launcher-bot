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
const pageSize = 12;

const removeMenu = new Menu<Context>("launcher-remove")
	.dynamic((ctx: Context) => {
		const range = new MenuRange<Context>();
		const apps = ctx.session.apps;
		let i = ctx.session.removePage ?? 1;
		const total = Math.ceil(apps.length / pageSize);
		console.log(apps.length, total);
		if (i > total) {
			ctx.session.removePage = 1;
			i = 1;
		}
		const paginatedApps = apps.slice(
			(i - 1) * pageSize,
			(i - 1) * pageSize + pageSize,
		);
		paginatedApps.forEach((app, i) => {
			range.text(`➖ ${app.title}`, (ctx) => {
				ctx.session.apps = apps.filter((a) => a.link !== app.link);
				ctx.menu?.update();
			});
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		range
			.row()
			.text("« Previous", (ctx) => {
				if (i > 1) {
					ctx.session.removePage = i - 1;
					ctx.menu.update();
				}
			})
			.text((ctx) => {
				return `${i}/${total}`;
			})
			.text("Next »", (ctx) => {
				if (i < total) {
					ctx.session.removePage = i + 1;
					ctx.menu.update();
				}
			})
			.row()
			.back("« Back to Settings");
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
		let i = ctx.session.addPage ?? 1;
		const total = Math.ceil(apps.length / pageSize);
		console.log(apps.length, total);
		if (i > total) {
			ctx.session.addPage = 1;
			i = 1;
		}
		const paginatedApps = apps.slice(
			(i - 1) * pageSize,
			(i - 1) * pageSize + pageSize,
		);
		paginatedApps.forEach((app, i) => {
			range.text(`➕${app.title}`, (ctx) => {
				ctx.session.apps = [...userApps, app];
				ctx.menu.update();
			});
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		range
			.row()
			.text("« Previous", (ctx) => {
				if (i > 1) {
					ctx.session.addPage = i - 1;
					ctx.menu.update();
				}
			})
			.text((ctx) => {
				return `${i}/${total}`;
			})
			.text("Next »", (ctx) => {
				if (i < total) {
					ctx.session.addPage = i + 1;
					ctx.menu.update();
				}
			})
			.row()
			.back("« Back to Settings");
		return range;
	})
	.row();

const settinsMenu = new Menu<Context>("launcher-settings")
	.submenu("REMOVE ➖", "launcher-remove")
	.submenu("ADD ➕", "launcher-add")
	.row()
	.back("« Back to Home");

settinsMenu.register(removeMenu);
settinsMenu.register(addMenu);

const menu = new Menu<Context>("launcher")
	.dynamic(async (ctx) => {
		const range = new MenuRange<Context>();
		const apps = ctx.session.apps;
		let i = ctx.session.homePage ?? 1;
		const total = Math.ceil(apps.length / pageSize);
		console.log(apps.length, total);
		if (i > total) {
			ctx.session.homePage = 1;
			i = 1;
		}
		const paginatedApps = apps.slice(
			(i - 1) * pageSize,
			(i - 1) * pageSize + pageSize,
		);
		paginatedApps.forEach((app, i) => {
			range.url(`${app.title}`, app.link);
			if ((i + 1) % 3 === 0) {
				range.row();
			}
		});
		range
			.row()
			.text("« Previous", (ctx) => {
				if (i > 1) {
					ctx.session.homePage = i - 1;
					ctx.menu.update();
				}
			})
			.text((ctx) => {
				return `${i}/${total}`;
			})
			.text("Next »", (ctx) => {
				if (i < total) {
					ctx.session.homePage = i + 1;
					ctx.menu.update();
				}
			});
		return range;
	})
	.row()
	.submenu("Settings 🛠️", "launcher-settings");

menu.register(settinsMenu);

async function addApp(conversation: ConversationContext, ctx: Context) {
	await ctx.reply(
		"OK. Send me a list of apps. Please use this format: \n\n MiniApp1 - https://t.me/bot1/join \n MiniApp2 - https://t.me/bot2/join",
	);
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
launcher.use(menu);

launcher.command("add", async (ctx) => {
	await ctx.conversation.enter("addApp");
});

launcher.command("home", (ctx) => {
	ctx.reply(`👋 ${ctx.chat.first_name}, have a good day!`, {
		reply_markup: menu,
	});
});

export { composer as launcherFeature };
