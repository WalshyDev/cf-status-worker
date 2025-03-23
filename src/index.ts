import { publishMessage, sendToDiscord } from './discord';
import { attachDebug } from './utils';
import Config from './config';

export default {
  async fetch(req: Request, env: Env) {
    try {
      if (req.headers.get('cf-ew-preview-server')) {
        // @ts-ignore
        globalThis.PREVIEW = true;
      }

      attachDebug(req);

      await this.handleRequest(env);

      return new Response('Ok');
    } catch(e) {
      // @ts-ignore
      return new Response(e.stack, { status: 500 });
    }
  },

  async scheduled(_: ScheduledController | null, env: Env) {
    await this.handleRequest(env);
  },

  async handleRequest(env: Env) {
    const incidents = await fetch(`${Config.STATUS_URL}/api/v2/incidents.json`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch incidents');
        return res.json<IncidentResponse>();
      })
      .then(res => res.incidents);
    const components = await fetch(`${Config.STATUS_URL}/api/v2/components.json`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch components');
        return res.json<ComponentResponse>();
      })
      .then(res => res.components);

    // Track if this is the first run, so we can ignore resolved incidents
    const firstRun = await env.KV.get('firstRun') === null;
    if (firstRun) {
      await env.KV.put('firstRun', new Date().toISOString());
    }

    // Process all incidents
    const res = await Promise.allSettled(incidents.map(async incident => {
      const kv = await env.KV.get<StoredIncident>(incident.id, 'json');
      // Log if we did not find the key in KV
      if (kv === null) {
        console.log(`[${incident.id}] In KV: ${kv !== null}`)
      }

      // On the first run, ignore any incidents that are already resolved
      // We'll store them as skipped so we don't keep checking them
      if (!kv && firstRun && ['resolved', 'postmortem'].includes(incident.status)) {
        await env.KV.put(incident.id, JSON.stringify({ skipped: true }));
        return;
      }
      if (kv && 'skipped' in kv) return;

      if (globalThis.DEBUG?.updateIncident === incident.id) {
        // Set update to now so we force an update
        incident.updated_at = new Date().toISOString();
      }
      if (kv === null) {
        await this.postNew(incident, components, env);
      } else {
        await this.postUpdate(incident, kv, components, env);
      }
    }));
    console.log(`Processed ${res.length} incidents (${res.filter(r => r.status === 'fulfilled').length} successful)`);
    res.forEach(r => r.status === 'rejected' && console.error(r.reason));
  },

  async postNew(incident: Incident, components: Component[], env: Env) {
    console.log(`[${incident.id}] New incident: ${incident.name}`);

    // Send to Discord and grab the message ID
    // If the incident status is excluded, we'll get null back
    const messageId = await sendToDiscord(incident, components, env);

    // Update the incident with the message ID
    if (messageId !== null) {
      incident.messageId = messageId;

      // Publish the message if configured
      if (Config.PUBLISH_CHANNEL_ID !== '') await publishMessage(incident, env).catch(console.error);
    }

    // Update KV
    await env.KV.put(incident.id, JSON.stringify(incident));
  },

  async postUpdate(incident: Incident, cachedIncident: Incident, components: Component[], env: Env) {
    // If there's no update or the cached incident doesn't have a message ID. There's no update needed
    if (incident.updated_at === null || !cachedIncident.messageId) {
      return;
    }

    // Make sure the messageId is set from cache
    incident.messageId = cachedIncident.messageId;

    // It has been updated so post a new update!
    if (incident.updated_at !== cachedIncident.updated_at) {
      console.log(`[${incident.id}] Updated incident: ${incident.name}`);

      // Update Discord
      await sendToDiscord(incident, components, env);

      // Update KV
      await env.KV.put(incident.id, JSON.stringify(incident));
    }
  },
}
