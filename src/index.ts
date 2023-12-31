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

      return new Response('Fired');
    } catch(e) {
      // @ts-ignore
      return new Response(e.stack, { status: 500 });
    }
  },

  async scheduled(_: ScheduledController | null, env: Env) {
    try {
      await this.handleRequest(env);
    } catch(e) {
      // @ts-ignore
      return new Response(e.stack, { status: 500 });
    }
  },

  async handleRequest(env: Env) {
    const res = await fetch(`${Config.STATUS_URL}/api/v2/incidents.json`)
    const json = await res.json<IncidentResponse>();

    // Track if this is the first run, so we can ignore resolved incidents
    const firstRun = await env.KV.get('firstRun') === null;
    if (firstRun) {
      await env.KV.put('firstRun', new Date().toISOString());
    }

    await Promise.all(json.incidents.map(async incident => {
      const kv = await env.KV.get<StoredIncident>(incident.id, 'json');
      console.log('-----\nIncident ' + incident.id + ' in KV: ' + (kv !== null) + '\n-----');

      // On the first run, ignore any incidents that are already resolved
      // We'll store them as skipped so we don't keep checking them
      if (!kv && firstRun && incident.status === 'resolved') {
        await env.KV.put(incident.id, JSON.stringify({ skipped: true }));
        return;
      }
      if (kv && 'skipped' in kv) return;

      if (globalThis.DEBUG?.updateIncident === incident.id) {
        // Set update to now so we force an update
        incident.updated_at = new Date().toISOString();
      }
      if (kv === null) {
        await this.postNew(incident, env);
      } else {
        await this.postUpdate(incident, kv, env);
      }
    }));

    return new Response('Ok!');
  },

  async postNew(incident: Incident, env: Env) {
    // Send to Discord and grab the message ID
    const messageId = await sendToDiscord(incident, env);

    // Update the incident with the message ID
    if (messageId !== null) {
      incident.messageId = messageId;
    }
    // Update KV
    await env.KV.put(incident.id, JSON.stringify(incident));

    // Check if we can publish
    if (messageId !== null && Config.PUBLISH_CHANNEL_ID !== '') {
      // Publish the message
      await publishMessage(messageId, env);
    }

    if (messageId === null) {
      console.error('SANITY CHECK: Message ID from postNew is null!!');
    }
  },

  async postUpdate(incident: Incident, cachedIncident: Incident, env: Env) {
    // If there's no update or the cached incident doesn't have a message ID. There's no update needed
    if (incident.updated_at === null || !cachedIncident.messageId) {
      return;
    }

    // Make sure the messageId is set from cache
    incident.messageId = cachedIncident.messageId;

    // It has been updated so post a new update!
    if (incident.updated_at !== cachedIncident.updated_at) {
      console.log('Updating incident:', incident.id);

      // Update KV
      await env.KV.put(incident.id, JSON.stringify(incident));
      // Update Discord
      await sendToDiscord(incident, env);
    }
  },
}
