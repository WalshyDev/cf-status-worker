import { getDescription, getImpact, getIncidentLink, getStatusColor } from './utils';
import Config from './config';

const DISCORD_API = `https://discord.com/api/v9`;

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

  const res = await postDiscordMessage(reqObj, env, update ? messageId : undefined);

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
  if (!incident.messageId || !Config.PUBLISH_MESSAGE) return;

  console.log(`[${incident.id}] Sending POST /messages/${incident.messageId}/crosspost to Discord`);

  const res = await fetch(`${DISCORD_API}/channels/${Config.PUBLISH_CHANNEL_ID}/messages/${incident.messageId}/crosspost`, {
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

async function postDiscordMessage(message: DiscordMessage, env: Env, updateMessageId?: string) {
  // DISCORD_TOKEN is preferred really but to keep things consistent for now, let's prefer DISCORD_WEBHOOK internally
  if (env.DISCORD_WEBHOOK) {
    // Always make sure ?wait=true is there so we get the message back from Discord
    return fetch(env.DISCORD_WEBHOOK + (updateMessageId !== undefined ? `/messages/${updateMessageId}?wait=true'` : '?wait=true'), {
      method: updateMessageId !== undefined ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

  } else if (env.DISCORD_TOKEN && Config.PUBLISH_CHANNEL_ID !== '') {
    // https://discord.com/developers/docs/resources/channel#create-message
    return fetch(`${DISCORD_API}/channels/${Config.PUBLISH_CHANNEL_ID}/messages${updateMessageId !== undefined ? `/${updateMessageId}` : ''}`, {
      method: updateMessageId !== undefined ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
      body: JSON.stringify(message)
    });

  } else {
    throw new Error('Unable to post message to Discord, no DISCORD_TOKEN or DISCORD_WEBHOOK env variable set');
  }
}
