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

function getTruncated(items: string[], joiner: string, suffix: string, length: number) {
  if (items.join(joiner).length <= length) return items.join(joiner);

  const truncated = [ ...items ];
  while (truncated.join(joiner).length + suffix.length > length) {
    if (truncated.length === 1) {
      const suffixNewline = suffix.startsWith('\n');
      truncated[0] = truncated[0].slice(0, length - suffix.length - (suffixNewline ? 3 : 0));
      truncated[0] = truncated[0].slice(0, truncated[0].lastIndexOf(' ')) + (suffixNewline ? ' ...' : ' ');
    } else {
      truncated.pop();
    }
  }

  return truncated.join(joiner) + suffix;
}

export function getDescription(incident: Incident, spacing: boolean) {
  // We want the most recent updates first
  const sorted = [ ...incident.incident_updates ].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime;
  });

  const updates = sorted.map(update => {
    const time = new Date(update.created_at);
    const ms = Math.floor(time.getTime() / 1000);
    return `**${pascalCase(update.status)}** - <t:${ms}:F> (<t:${ms}:R>)\n${update.body}`;
  });

  // Hack: We want a bit of spacing between the statuses and the impact field
  const spacer = spacing ? '\n** **\n** **' : '';
  return getTruncated(updates, '\n\n', `\n\n... [view more updates](${getIncidentLink(incident)})`, 4096 - spacer.length) + spacer;
}

export function getImpact(incident: Incident, components: Component[]): string | null {
  if (incident.components.length === 0) return null;

  const groups = components.reduce((acc, component) => component.group
    ? { ...acc, [component.id]: component }
    : acc, {} as { [id: string]: Component });

  const impacted = incident.components.map(component => [
    component.group_id && groups[component.group_id].name,
    component.name,
    pascalCase(component.status),
  ].filter(Boolean).join(' - '));

  return getTruncated(impacted, '\n', `\n\n... [view full impact](${getIncidentLink(incident)})`, 1024);
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
