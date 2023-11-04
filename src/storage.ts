export async function saveToStorage(env: Env, key: string, value: any) {
  const now = new Date().getTime();
  const data = JSON.stringify({ ts: now, value });

  await Promise.allSettled([
    env.KV && env.KV.put(key, data),
    env.D1 &&
      env.D1.prepare(
        `INSERT INTO KV(key, value) VALUES(?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2`,
      )
        .bind(key, data)
        .run(),
    env.R2 && env.R2.put(key, data),
  ]);
}

export async function retrieveFromStorage<T>(
  env: Env,
  key: string,
): Promise<T | null> {
  const rawValues = await Promise.allSettled([
    env.KV && env.KV.get(key),
    env.D1 &&
      env.D1.prepare(`SELECT value WHERE key = ?`).bind(key).first("value"),
    env.R2 && env.R2.get(key).then((object) => object && object.text()),
  ]);
  const values = rawValues.filter(
    (x) => x.status === "fulfilled" && x.value,
  ) as Array<PromiseFulfilledResult<string>>;
  // none of our storage providers had the value in stock, so either all of them are
  // broken, or its just a new key
  if (!values.length) return null;

  const parsed: Array<{ ts: number; value: T }> = [];
  for (const value of values) {
    // lets make sure we handle data corruption cases
    try {
      parsed.push(JSON.parse(value.value));
    } catch {}
  }
  if (!parsed.length) {
    console.error("all data stores hold corrupted data, somehow...", values);
    return null;
  }

  // to account for cases where a write failed, we have the timestamp!
  // so we use whatever has the newest timestamp
  const freshness = parsed.sort((a, b) => b.ts - a.ts);
  return freshness[0].value;
}
