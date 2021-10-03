# Cloudflare Status Worker

This Worker is pretty simple, when there's an incident logged on
[Cloudflare's Status Page](https://www.cloudflarestatus.com/)
the worker will send a new Discord message about it.
When there's an update to the incident, the message is updated!

I made this for my personal server so that when there's an incident I can
find out early and quickly. Saves me pulling my hair out for a while
and finally checking the status page later only to see a problem.

## How do I set this up?

After [creating a webhook](#creating-a-webhook), you can either use
[the 'Deploy with Workers' button](#quick-setup), or use
[GitHub Actions](#deploying-with-github-actions) or
[the Wrangler CLI](#deploying-with-wrangler-cli).

### Creating a Webhook

To create a webhook, go into your server's settings, then Integrations →
Webhooks → New Webhook. Then give the new webhook a useful name and set the
channel and copy the webhook URL.

### Quick Setup

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/WalshyDev/cf-status-worker)

Click the button above, and follow the instructions. After, head over to the
fork that was created in your GitHub account. Now go to the repository settings,
find Secrets and press 'New repository secret'. Set the name as
`DISCORD_WEBHOOK` and paste your webhook URL into the box below. You may need to
manually trigger the GitHub Actions workflow by editing any file in your
repository.

### Deploying with GitHub Actions

Firstly, create a fork of this project, by pressing the Fork button in the
top-right of the page.

Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/profile), and click
'My Profile' on the top-right of the page. Go to the 'API Tokens' tab, and
copy your 'Global API Key'. You will also need to make a note of your account's
ID, by going onto any of your websites and looking in the right pane.

Back in your repository, go to settings, then secrets. Create three repository
secrets.

- Name: `CF_API_TOKEN`, Value: _(your Cloudflare Global API Key)_
- Name: `CF_ACCOUNT_ID`, Value _(your Cloudflare Account ID)_
- Name: `DISCORD_WEBHOOK`, Value: _(your Discord webhook ID)_

Now, trigger a build by editing a file in the respository.

### Deploying with Wrangler CLI

Wrangler is Cloudflare's CLI for interacting with Workers. Download using
`npm install --global @cloudflare/wrangler`.

Now login to your Cloudflare account using `wrangler login`.

Clone this repository to get a local copy.

Get your account ID by running `wrangler whoami` and put it in the
`wrangler.toml` file.

Create a KV namespace (for storing incidents) by running
`wrangler kv:namespace create "INCIDENTS"`. Then update `wrangler.toml` with
the ID of the KV namespace.

Finally, run `wrangler publish` to deploy the worker.

## Example
### New Incident
![New Incident](https://user-images.githubusercontent.com/8492901/131903623-352dd6ec-bd7f-470f-9468-4a271c4ddc69.png)

### In Progress Incident
![In_Progress Incident](https://user-images.githubusercontent.com/8492901/131903520-5aabc84d-786a-4fb8-841c-f7efda00e316.png)

### Resolved Incident
![Resolved Incident](https://user-images.githubusercontent.com/8492901/131903522-a4cdc4bd-ad6e-4d1d-b6dd-65950cca9b45.png)
