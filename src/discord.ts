import { getDescription, getImpact, getIncidentLink, getStatusColor } from './utils';
import Config from './config';

export async function sendToDiscord(incident: Incident, components: Component[], env: Env): Promise<string | null> {
  if (Config.EXCLUDED_STATUSES.includes(incident.status)) {
    return null;
  }

  const fields: { name: string, value: string, inline?: boolean }[] = [];

  const impact = getImpact(incident, components);
  if (impact !== null) {
    fields.push({
      name: 'Impacted Services',
      value: impact,
      inline: false,
    });
  }

  const messageId = incident.messageId;
  const update = messageId !== undefined;

  const reqObj = {
    username: Config.NAME,
    avatar_url: Config.AVATAR_URL,
    embeds: [{
      type: 'rich',
      title: `${incident.name}`,
      url: getIncidentLink(incident),
      description: getDescription(incident, impact !== null),
      timestamp: incident.started_at,
      color: getStatusColor(incident.status),
      fields,
    }]
  };

  console.log(`[${incident.id}] Sending ${update ? 'PATCH' : 'POST'}${update ? ` /messages/${messageId}` : ''} to Discord with body: ${JSON.stringify(reqObj)}`);

  // Always make sure ?wait=true is there so we get the message back from Discord
  const res = await fetch(env.DISCORD_WEBHOOK + (update ? `/messages/${messageId}?wait=true'` : '?wait=true'), {
    method: update ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reqObj)
  });
  
  const txt = await res.text();
  const log = JSON.stringify({ status: res.status, body: txt, headers: Object.fromEntries(res.headers) });
  console.log(`[${incident.id}] Discord send response: ${log}`);

  if (res.status === 200) {
    // Return the message ID
    const body: DiscordResponse = JSON.parse(txt);
    if (body.id) {
      console.log(`[${incident.id}] Discord message ID: ${body.id}`);
      return body.id;
    }
  }
  
  throw new Error(`[${incident.id}] Failed to send message to Discord: ${log}`);
}

export async function publishMessage(incident: Incident, env: Env) {
  if (!incident.messageId) return;

  console.log(`[${incident.id}] Sending POST /messages/${incident.messageId}/crosspost to Discord`);

  const res = await fetch(`https://discord.com/api/v9/channels/${Config.PUBLISH_CHANNEL_ID}/messages/${incident.messageId}/crosspost`, {
    method: 'POST',
    headers: {
      Authorization: 'Bot ' + env.DISCORD_TOKEN
    }
  });
  
  const txt = await res.text();
  const log = JSON.stringify({ status: res.status, body: txt, headers: Object.fromEntries(res.headers) });
  console.log(`[${incident.id}] Discord publish response: ${log}`);

  if (res.ok) return;
  throw new Error(`[${incident.id}] Failed to publish message to Discord: ${log}`);
}
