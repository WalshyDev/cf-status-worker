interface Config {
  STATUS_URL: string;

  NAME: string;
  AVATAR_URL: string;
  PUBLISH_CHANNEL_ID: string;
  EXCLUDED_STATUSES: IncidentStatus[];
}

export default Object.freeze<Config>({
  ////////////////////////////////////////
  // Status stuff
  ////////////////////////////////////////
  STATUS_URL: 'https://www.cloudflarestatus.com',

  ////////////////////////////////////////
  // Discord stuff
  ////////////////////////////////////////
  NAME: 'Status Update',
  // Discord bot avatar URL (Make sure to respect trademarks and brand guidelines!)
  AVATAR_URL: '',
  // Channel ID used for publishing
  PUBLISH_CHANNEL_ID: '',
  // Statuses you want excluded from being sent
  EXCLUDED_STATUSES: ['maintenance'],
});