async function sync() {
	const url =
		"https://tappscenter.org/api/entities/applications?pagination[pageSize]=1000&pagination[page]=1&sort[0]=editors_choice:asc&sort[1]=createdAt:desc";
	const data = await fetch(url, {
		headers: {
			Authorization: `Bearer ${Bun.env.TAPPS_TOKEN}`,
		},
	}).then((res) => res.json());
	const path = "./src/bot/features/launcher/apps/tapps.json";
	Bun.write(
		path,
		JSON.stringify(
			data.data
				.map((a: any) => ({
					title: a.attributes.title,
					link: a.attributes.webapp_url,
					description: a.attributes.description,
				}))
				.filter((a: any) => !!a.link),
		),
	);
	await Bun.$`bun fmt`;
}

sync().catch(console.error);
