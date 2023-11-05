# Status Cloudflare Worker

This Cloudflare Worker is made to monitor a status page for incidents. If there is one, it will post into a Discord server (with optional publishing) and continously update the message with incident updates. This allows you to easily track incidents which may be impacting you right inside of Discord.

Want to see it in action?\
We use this in the [Cloudflare Discord](https://discord.gg/cloudflaredev), come check it out!

## How do I set this up?

There are a few steps to the setup but it should hopefully be pretty straightforward:

1. Clone the repo
2. Edit `src/config.ts` - here you can set the status URL, name of the webhook, avatar and publish channel
3. Put your IDs in `wrangler.toml`
4. Add Discord webhook with `wrangler secret put DISCORD_WEBHOOK` \
  4b. (optional) If you want publishing, you'll also need to add a Discord bot token with `wrangler secret put DISCORD_TOKEN`
5. Run `npm run publish` :)

## Example
### New Incident
![New Incident](https://user-images.githubusercontent.com/8492901/131903623-352dd6ec-bd7f-470f-9468-4a271c4ddc69.png)

### In Progress Incident
![In_Progress Incident](https://user-images.githubusercontent.com/8492901/131903520-5aabc84d-786a-4fb8-841c-f7efda00e316.png)

### Resolved Incident
![Resolved Incident](https://user-images.githubusercontent.com/8492901/131903522-a4cdc4bd-ad6e-4d1d-b6dd-65950cca9b45.png)

## Setting Up Automated Publishing

You can use the [Discord API](https://discord.com/developers/docs) to automatically publish your webhook alerts to all of your announcement subscribers.

To get setup:

1. Create a new or use a pre-existing [Discord Application](https://discord.com/developers/applications).
2. Make note of your application id listed on the `General Information` page you are brought to. You will need this in step 5 to grant your user the correct permissions.
3. Add a bot to your newly created application by going under `Settings → Bot` and pressing `Add Bot`.
4. Copy your `Bot Token` and insert it into your project with `wrangler secret put DISCORD_TOKEN`, being careful to not expose it anywhere else.
5. We now need to add your bot user to the server. Using this feature requires your bot to have the `SEND_MESSAGES` and `MANAGE_MESSAGES` permission, so we will need to grant them those permissions. Take the application id you noted in step 2, replacing the application id below and visiting the link in your browser.

```
https://discord.com/oauth2/authorize?client_id=INSERT-APPLICATION-ID&scope=bot&permissions=10240
```