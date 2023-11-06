import { publishMessage, sendToDiscord } from './discord';
import { attachDebug } from './utils';
import Config from './config';
import { retrieveFromStorage, saveToStorage } from './storage';

export default {
  async fetch(req: Request, env: Env) {
    try {
      if (req.headers.get('cf-ew-preview-server')) {
        // @ts-ignore
        globalThis.PREVIEW = true;
      }

      attachDebug(req);

      await this.scheduled(null, env);

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

    await Promise.all(json.incidents.map(async incident => {
      const stored = await retrieveFromStorage<Incident>(env, incident.id);

      console.log('-----\nIncident ' + incident.id + ' in storage: ' + (stored !== null) + '\n-----');

      if (globalThis.DEBUG?.updateIncident === incident.id) {
        // Set update to now so we force an update
        incident.updated_at = new Date().toISOString();
      }

      if (stored === null) {
        await this.postNew(incident, env);
      } else {
        await this.postUpdate(incident, stored, env);
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
    // Update storage
    await saveToStorage(env, incident.id, incident);

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

      // Update storage 
      await saveToStorage(env, incident.id, incident);
      // Update Discord
      await sendToDiscord(incident, env);
    }
  },
}
