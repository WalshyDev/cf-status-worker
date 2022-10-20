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
  let description = '';

  for (const update of incident.incident_updates) {
    const time = new Date(update.created_at);

    const ms = Math.floor(time.getTime() / 1000);
    description += `\n**${pascalCase(update.status)}** - <t:${ms}:F> (<t:${ms}:R>)`
      + `\n${update.body}\n`;
  }

  return description.trim();
}

export function getImpact(incident: Incident): string | null {
  if (incident.components.length === 0) {
    return null;
  }

  return incident.components.map(component => `${component.name} - ${pascalCase(component.status)}`).join('\n');
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
