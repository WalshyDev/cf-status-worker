import { publishMessage, sendToDiscord } from './discord';
import { attachDebug } from './utils';
import Config from './config';

const INCIDENTS_ETAG_KEY = 'incidentsEtag';

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
    let storedEtag: string | null = null;
    // A forced debug update needs the full incident list, so skip the ETag checks
    if (!globalThis.DEBUG?.updateIncident) {
      storedEtag = await env.KV.get(INCIDENTS_ETAG_KEY);
    }

    const headers: Record<string, string> = {};
    if (storedEtag !== null) headers['If-None-Match'] = storedEtag;

    const incidentsRes = await fetch(`${Config.STATUS_URL}/api/v2/incidents.json`, { headers });
    const etag = incidentsRes.headers.get('ETag');
    // Nothing changed since the last successful run, so skip parsing and per-incident KV reads
    if (incidentsRes.status === 304) return;
    if (!incidentsRes.ok) throw new Error('Failed to fetch incidents');
    // Some Statuspage sites ignore If-None-Match and send a 200 with the same ETag
    if (etag !== null && etag === storedEtag) return;
    const { incidents } = await incidentsRes.json<IncidentResponse>();

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

    // Only remember this version once every incident went through, so failures are retried next run
    if (etag && res.every(r => r.status === 'fulfilled')) {
      await env.KV.put(INCIDENTS_ETAG_KEY, etag);
    }
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
