import Config from './config';

const statusColors: { [status in IncidentStatus]: number } = {
  scheduled: 16155167,
  maintenance: 16155167,
  investigating: 16711680,
  identified: 16760576, //15158332
  monitoring: 16760576,
  resolved: 32768,
};

export function getStatusColor(status: IncidentStatus) {
  const color = statusColors[status];
  if (typeof(color) === 'number') {
    return color;
  }
  return 0;
}

export function getDescription(incident: Incident) {
  const description = [];

  for (const update of incident.incident_updates) {
    const time = new Date(update.created_at);

    const ms = Math.floor(time.getTime() / 1000);
    description.push(
      `**${pascalCase(
        update.status,
      )}** - <t:${ms}:F> (<t:${ms}:R>)\n${update.body.trim()}`,
    );
  }

  // the hack for spacing between description and fields is adding 12 characters to
  // the description
  const limit = 4096 - incident.components.length ? 12 : 0;
  return fitIntoLimit(description, limit, "\n");
}

export function getImpact(incident: Incident): string | null {
  if (incident.components.length === 0) {
    return null;
  }

  return fitIntoLimit(
    incident.components.map(
      (component) => `${component.name} - ${pascalCase(component.status)}`,
    ),
    1024,
    "\n",
  );
}

export function pascalCase(str: string): string {
  str = str.charAt(0).toUpperCase() + str.slice(1);
  
  let idx = 0;
  while ((idx = str.indexOf('_', idx)) !== -1) {
    str = str.slice(0, idx) + ' ' + str.charAt(idx + 1).toUpperCase() + str.slice(idx + 2);
    ++idx;
  }

  return str;
}

export function getIncidentLink(incident: Incident): string {
  return `${Config.STATUS_URL}/incidents/${incident.id}`;
}

export function isDev(): boolean {
  // @ts-ignore
  return globalThis.MINIFLARE !== undefined || globalThis.PREVIEW;
}

export function attachDebug(req: Request) {
  const { searchParams } = new URL(req.url);

  const debug: Debug = {};

  const incidentId = searchParams.get('updateIncident');
  if (incidentId !== null) {
    debug.updateIncident = incidentId;
  }

  globalThis.DEBUG = debug;
}

export function getDebug(): Debug | null {
  // @ts-ignore
  if (globalThis.DEBUG) {
    // @ts-ignore
    return globalThis.DEBUG as Debug;
  }
  return null;
}

// when we discard some elements we want to include a hint on how much we discarded
// the X is replaced with the actual count
const hiddenDisclaimer = "\n*And X more*";

export function fitIntoLimit(
  arr: Array<string>,
  limit: number,
  delimiter: string,
): string {
  // no need to do anything
  const allOfThem = arr.join(delimiter);
  if (allOfThem.length < limit) return allOfThem;

  let length = 0;
  let fitting = [];
  for (let i = 0; i < arr.length; i++) {
    const overhead =
      hiddenDisclaimer.length + (arr.length - i).toString().length - 1;
    if (length + arr[i].length >= limit - overhead) {
      if (length === 0) {
        // if this is the first element, we should slice it instead so we dont end up
        // with an empty message
        // we are also adding the unicode … which is just one character!
        return arr[i].slice(0, limit - 1) + "…";
      }
      break;
    }
    fitting.push(arr[i]);
    length += arr[i].length + delimiter.length;
  }
  return (
    fitting.join(delimiter) +
    hiddenDisclaimer.replace(/X/, (arr.length - fitting.length).toString())
  );
}
