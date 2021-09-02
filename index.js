import { parseFeed } from 'htmlparser2';

addEventListener('fetch', (event) => {
  return event.respondWith(handleRequest(event));
})

addEventListener("scheduled", event => {
  event.waitUntil(handleRequest(event))
})

const statusColors = {
  scheduled: 16155167,
  investigating: 16711680,
  identified: 16760576, //15158332
  monitoring: 16760576,
  resolved: 32768,
};

// { id, title, link, description, pubDate }

//////////////////////////
// Handler
//////////////////////////
async function handleRequest(event) {
  const res = await fetch('https://www.cloudflarestatus.com/history.atom')
  const txt = await res.text();

  const incidents = parseFeed(txt).items;

  for (const incident of incidents) {
    delete incident.media;

    const kv = await KV.get(incident.id);

    if (kv === null) {
      await postNew(incident);
    } else {
      await postUpdate(kv, incident);
    }
  }

  return new Response('Ok!');
}

async function postNew(incident) {
  const messageId = await sendToDiscord('New Incident', incident);

  incident.messageId = messageId;

  await KV.put(incident.id, JSON.stringify(incident));
}

async function postUpdate(kv, incident) {
  const cachedVal = JSON.parse(kv);

  const date = new Date(incident.pubDate);
  const cachedDate = new Date(cachedVal.pubDate);

  incident.messageId = cachedVal.messageId;

  // It has been updated so post a new update!
  if (date.getTime() !== cachedDate.getTime()) {
    await KV.put(cachedVal.id, JSON.stringify(incident));
    await sendToDiscord('Incident Update', incident);
  }
}

//////////////////////////
// Utils
//////////////////////////
function getStatus(msg) {
  let status = msg.substring(msg.indexOf('<strong>') + 8);
  status = status.substring(0, status.indexOf('</strong>'));

  if (status.includes('SCHEDULED EVENT')) {
    status = 'scheduled';
  }

  return status.toLowerCase();
}

function getStatusColor(msg) {
  const status = getStatus(msg);

  const color = statusColors[status];
  if (typeof(color) === 'number') {
    return color;
  }
  return 0;
}

async function sendToDiscord(type, incident) {
  const desc = htmlToMarkdown(incident.description);

  const messageId = incident.messageId;
  const update = messageId !== undefined;

  const res = await fetch(DISCORD_WEBHOOK + (update ? `/messages/${messageId}` : '?wait=true'), {
    method: update ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'Cloudflare Status',
      // avatar_url: '',
      embeds: [{
        type: 'rich',
        title: type,
        url: incident.link,
        description: desc,
        timestamp: incident.pubDate,
        color: getStatusColor(incident.description),
      }]
    })
  });

  if (!update) {
    const msg = await res.json();
    return msg.id;
  }
  return true;
}

function htmlToMarkdown(html) {
  const tagRegex = /<\/?[a-z -=]+>/gm;

  let result = html;

  result = result.replaceAll('<p>', '')
    .replaceAll('</p>', '\n')
    // New lines
    .replaceAll('<br>', '\n')
    .replaceAll('<br/>', '\n')
    .replaceAll('<br />', '\n')
    // Bold text
    .replaceAll('<strong>', '**')
    .replaceAll('</strong>', '**')
    // Just remove 'non breaking space'
    .replaceAll('&nbsp;', '');

  // Anything else
  result = result.replace(tagRegex, '');

  return result.trim();
}
