# bank-sms-agent — BeagleBone Black + SIM800C

Reads every SMS on the bank card's SIM and forwards it, signed, to the platform
(`POST /api/bank-sms/messages`). The platform parses deposit SMS with each card's template
(/admin/finance → «پیامک واریز») and pays the wallet top-up whose exact rial amount matches.
Node 18+, **no npm dependencies** (the UART is set raw with `stty` and used as a file), so it is not
an npm workspace (`.mjs`, no package.json) and can move to its own repository unchanged.

## How it works
- PDU mode (`AT+CMGF=0`): Persian (UCS2) and multi-part bank SMS decode reliably; parts are joined
  by their concatenation header (`src/pdu.mjs`, `src/assemble.mjs`).
- `+CMTI` → read the new SMS; every minute `AT+CMGL=4` sweeps the SIM for anything missed.
- Complete messages are written to `DATA_DIR/outbox/<hash>.json` first, then sent; the SIM slots
  are deleted only after the server answered 200 (a resend is answered `duplicate`). No internet →
  messages wait on disk and the SIM.
- Heartbeat every 5 min (signal, registration, SIM usage, queue) → shown on /admin/bank-sms.
- 3 AT timeouts in a row → pulse PWRKEY (if `PWRKEY_GPIO` is set) and exit; systemd restarts it.
- Signature: hex HMAC-SHA256(DEVICE_SECRET, "<ms timestamp>.<body>"), ±5 min — keep the board's
  clock synced (`timedatectl set-ntp true`).

## Wiring
SIM800C TXD → P9.26 (UART1 RX), RXD → P9.24 (UART1 TX), GND → GND. Power the SIM800C from its own
4 V / 2 A supply (it draws 2 A peaks while transmitting) with a common ground — not from the board.
Most SIM800C breakout boards level-shift to 3.3 V; check yours (the bare module is 2.8 V logic).
Optional: PWRKEY to a GPIO through a transistor for remote resets.

## Install (on the BeagleBone)
```sh
# 1. UART1: in /boot/uEnv.txt add  uboot_overlay_addr4=/lib/firmware/BB-UART1-00A0.dtbo  and reboot
ls -l /dev/ttyS1
# 2. code + user
sudo useradd -r -G dialout -s /usr/sbin/nologin bank-sms
sudo git clone --depth 1 -b production https://github.com/smnikzad91/appointment_scheduling /tmp/nobatet
sudo cp -r /tmp/nobatet/apps/bank-sms-agent /opt/bank-sms-agent
# 3. config (DEVICE_SECRET = the server's BANK_SMS_DEVICE_SECRET)
sudo cp /opt/bank-sms-agent/deploy/bank-sms-agent.env.example /etc/bank-sms-agent.env
sudo chmod 600 /etc/bank-sms-agent.env && sudo nano /etc/bank-sms-agent.env
# 4. service
sudo cp /opt/bank-sms-agent/deploy/bank-sms-agent.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now bank-sms-agent
journalctl -u bank-sms-agent -f
```
### Without systemd (plain node)
```sh
cd /opt/bank-sms-agent
cp deploy/bank-sms-agent.env.example .env && chmod 600 .env && nano .env   # DATA_DIR=/opt/bank-sms-agent/data is fine
sudo usermod -aG dialout $USER                                              # serial port access (log in again)
nohup ./deploy/run.sh >> agent.log 2>&1 &                                   # loads .env, restarts after every exit
tail -f agent.log
```
At boot: `crontab -e` → `@reboot /opt/bank-sms-agent/deploy/run.sh >> /opt/bank-sms-agent/agent.log 2>&1`.
Stop: `pkill -f deploy/run.sh; pkill -f src/index.mjs`.

Manual check of the modem: `sudo systemctl stop bank-sms-agent; screen /dev/ttyS1 115200`, type `AT`.

## Tests
`node --test apps/bank-sms-agent/test/*.test.mjs` (PDU decoding incl. Persian/multi-part, assembly).
