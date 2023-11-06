declare module globalThis {
  var MINIFLARE: boolean | undefined;
  var PREVIEW: boolean | undefined;
  var DEBUG: Debug | undefined;  
}

interface Env {
  KV: KVNamespace;
  D1?: D1Database;
  R2?: R2Bucket;
  DISCORD_WEBHOOK: string;
  DISCORD_TOKEN: string;
}

interface IncidentResponse {
  page: Page;
  incidents: Incident[];
}

interface Page {
  id: string;
  name: string;
  url: string;
  time_zone: string;
  updated_at: string; 
}

type IncidentStatus = 'resolved' | 'monitoring' | 'identified' | 'investigating' | 'maintenance' | 'scheduled';
type ComponentStatus = 'operational' | 'partial_outage' | 'degraded_performance';
type Impact = 'major' | 'minor' | 'none';

interface Incident {
  id: string;
  name: string;
  status: IncidentStatus;
  created_at: string;
  updated_at: string | null;
  monitoring_at: string | null;
  resolved_at: string | null;
  impact: string;
  shortlink: string;
  started_at: string;
  page_id: string;
  incident_updates: IncidentUpdate[];
  components: Component[];

  // Custom properties
  messageId?: string;
}

interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  body: string;
  incident_id: string;
  created_at: string;
  updated_at: string;
  display_at: string;
  affected_components: ComponentUpdate[] | null;
}

interface ComponentUpdate {
  code: string;
  name: string;
  old_status: ComponentStatus;
  new_status: ComponentStatus;
}

interface Component {
  id: string;
  name: string;
  status: ComponentStatus;
  created_at: string;
  updated_at: string | null;
  position: number;
  description: string | null;
  showcase: boolean;
  start_date: string;
  group_id: string;
  page_id: string;
  group: boolean;
  only_show_if_degraded: boolean;
}

interface DiscordResponse {
  id: string;
}

interface Debug {
  // Allows me to trigger an update for a specific incident
  updateIncident?: string;
}
