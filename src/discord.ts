import { getDescription, getImpact, getIncidentLink, getStatusColor } from './utils';
import Config from './config';

export async function sendToDiscord(incident: Incident, env: Env): Promise<string | null> {
  if (Config.EXCLUDED_STATUSES.includes(incident.status)) {
    return null;
  }

  const fields: { name: string, value: string, inline?: boolean }[] = [];

  let description = getDescription(incident);
  const impact = getImpact(incident);

  if (impact !== null) {
    fields.push({
      name: 'Impacted Services',
      value: impact,
      inline: false,
    });

    // Hack: We want a bit of spacing between the statuses and the impact field.
    description += '\n** **\n** **';
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
      description,
      timestamp: incident.started_at,
      color: getStatusColor(incident.status),
      fields,
    }]
  };

  console.log(`Sending ${update ? 'PATCH' : 'POST'}${update ? ` /messages/${messageId}` : ''} to Discord with body: ${JSON.stringify(reqObj)}`);

  // Always make sure ?wait=true is there so we get the message back from Discord
  const res = await fetch(env.DISCORD_WEBHOOK + (update ? `/messages/${messageId}?wait=true'` : '?wait=true'), {
    method: update ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reqObj)
  });
  
  const txt = await res.text();

  console.log(`  Discord response: ${res.status} - ${txt}`);

  if (res.status === 200) {
    // Return the message ID
    const body: DiscordResponse = JSON.parse(txt);
    console.log(`  Discord message ID: ${body.id}`);
    return body.id;
  } else {
    // Error :(
    return null;
  }
}

export async function publishMessage(messageId: string, env: Env) {
  const res = await fetch(`https://discord.com/api/v9/channels/${Config.PUBLISH_CHANNEL_ID}/messages/${messageId}/crosspost`, {
    method: 'POST',
    headers: {
      Authorization: 'Bot ' + env.DISCORD_TOKEN
    }
  });

  if (res.ok) {
    const json = await res.json();
    console.log('Published', json);
  } else {
    let body = 'null';
    try {
      body = await res.text();
    } catch (e) {}

    console.error(`Failed to publish. Status: ${res.status} - Body: ${body}`);
  }
}