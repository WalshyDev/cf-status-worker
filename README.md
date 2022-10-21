# Status Cloudflare Worker

This Cloudflare Worker is made to monitor a status page for incidents. If there is one, it will post into a Discord server (with optional publishing) and continously update the message with incident updates. This allows you to easily track incidents which may be impacting you right inside of Discord.

Want to see it in action?\
We use this in the [Cloudflare Discord](https://discord.gg/cloudflaredev), come check it out!

## How do I set this up?
There are a few steps to the setup but it should hopefully be pretty straightforward:

1. Clone the repo
2. Edit `src/config.ts` - here you can set the status URL, name of the webhook, avatar and publish channel
3. Put your IDs in `wrangler.toml`
4. Add Discord webhook and Discord Bot token with `wrangler secret put DISCORD_WEBHOOK` and `wrangler secret put DISCORD_TOKEN`
5. Run `npm run publish` :)

## Example
### New Incident
![New Incident](https://user-images.githubusercontent.com/8492901/131903623-352dd6ec-bd7f-470f-9468-4a271c4ddc69.png)

### In Progress Incident
![In_Progress Incident](https://user-images.githubusercontent.com/8492901/131903520-5aabc84d-786a-4fb8-841c-f7efda00e316.png)

### Resolved Incident
![Resolved Incident](https://user-images.githubusercontent.com/8492901/131903522-a4cdc4bd-ad6e-4d1d-b6dd-65950cca9b45.png)
