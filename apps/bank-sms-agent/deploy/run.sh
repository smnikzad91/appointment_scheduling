#!/bin/sh
# Run the agent without systemd: loads ./.env (Node 18 has no --env-file) and restarts it whenever it
# exits — it exits on purpose after resetting a hung modem. Start in the background with
#   nohup ./deploy/run.sh >> agent.log 2>&1 &
# and at boot with a crontab line:  @reboot /opt/bank-sms-agent/deploy/run.sh >> /opt/bank-sms-agent/agent.log 2>&1
cd "$(dirname "$0")/.." || exit 1
if [ ! -f .env ]; then
  echo "missing $(pwd)/.env — copy deploy/bank-sms-agent.env.example to .env and fill in DEVICE_SECRET" >&2
  exit 1
fi
set -a
. ./.env
set +a
while true; do
  node src/index.mjs
  echo "$(date -u +%FT%TZ) agent exited ($?), restarting in 10 s"
  sleep 10
done
