# Cloudflare Status Worker

This Worker is pretty simple, when there's an incident logged on
[Cloudflare's Status Page](https://www.cloudflarestatus.com/)
the worker will send a new Discord message about it.
When there's an update to the incident, the message is updated!

I made this for my personal server so that when there's an incident I can
find out early and quickly. Saves me pulling my hair out for a while
and finally checking the status page later only to see a problem.

## How do I set this up?
There are a few steps to the setup but it should hopefully be pretty straightforward:

1. Clone the repo
2. Edit `src/config.ts` - here you can set the status URL, name of the webhook, avatar and publish channel
3. Put your IDs in `wrangler.toml`
4. Run `npm run publish` :)

## Example
### New Incident
![New Incident](https://user-images.githubusercontent.com/8492901/131903623-352dd6ec-bd7f-470f-9468-4a271c4ddc69.png)

### In Progress Incident
![In_Progress Incident](https://user-images.githubusercontent.com/8492901/131903520-5aabc84d-786a-4fb8-841c-f7efda00e316.png)

### Resolved Incident
![Resolved Incident](https://user-images.githubusercontent.com/8492901/131903522-a4cdc4bd-ad6e-4d1d-b6dd-65950cca9b45.png)
