import { runsBackgroundJobs } from './job-runner.js';

describe('runsBackgroundJobs', () => {
  it('runs in a single process and in pm2 instance 0 only', () => {
    expect(runsBackgroundJobs({})).toBe(true);
    expect(runsBackgroundJobs({ NODE_APP_INSTANCE: '0' })).toBe(true);
    expect(runsBackgroundJobs({ NODE_APP_INSTANCE: '1' })).toBe(false);
  });
});
