/**
 * Whether this process runs the background jobs (ReminderService, RebookReminderService). In
 * production pm2 runs the API as a cluster (ecosystem.config.cjs, NODE_APP_INSTANCE "0", "1", …);
 * the jobs run in instance 0 only. Their claims are atomic, so two runners would never send or
 * charge twice — but they'd double the polling and, for the rebook texts, the SMS gateway rate
 * (each run sends up to 20, 2.5 s apart; the gateway allows 30/min per key). Outside pm2
 * (NODE_APP_INSTANCE unset) the single process runs them.
 */
export function runsBackgroundJobs(env: NodeJS.ProcessEnv = process.env): boolean {
  const instance = env.NODE_APP_INSTANCE;
  return instance === undefined || instance === "" || instance === "0";
}
