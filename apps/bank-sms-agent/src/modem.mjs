import { execFileSync } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { EventEmitter } from "node:events";

// AT commands to the SIM800C over the BeagleBone's UART, without native modules: the port is set
// raw with `stty`, then read/written as a file. One command at a time; a command ends at OK /
// ERROR / +CME ERROR / +CMS ERROR. "+CMTI" (new SMS stored) is emitted as "sms" whenever it comes.

export class Modem extends EventEmitter {
  constructor(device, baud) {
    super();
    this.device = device;
    this.baud = baud;
    this.queue = Promise.resolve();
    this.current = null;
    this.buffer = "";
  }

  open() {
    execFileSync("stty", ["-F", this.device, String(this.baud), "raw", "-echo", "-echoe", "-echok", "-echoctl", "-echoke", "cs8", "-cstopb", "-parenb", "-crtscts", "clocal"]);
    this.out = createWriteStream(this.device, { flags: "r+" });
    this.in = createReadStream(this.device);
    this.in.on("data", (chunk) => this.onData(chunk.toString("latin1")));
    this.in.on("error", (err) => this.emit("error", err));
    this.out.on("error", (err) => this.emit("error", err));
  }

  onData(text) {
    this.buffer += text;
    let i;
    while ((i = this.buffer.search(/\r\n|\n/)) >= 0) {
      const line = this.buffer.slice(0, i).replace(/\r$/, "").trim();
      this.buffer = this.buffer.slice(i + (this.buffer[i] === "\r" ? 2 : 1));
      if (line) this.onLine(line);
    }
  }

  onLine(line) {
    const cmti = /^\+CMTI:\s*"?(\w+)"?,(\d+)/.exec(line);
    if (cmti) return this.emit("sms", Number(cmti[2]));
    const c = this.current;
    if (!c) return this.emit("unsolicited", line);
    if (line === c.echo) return; // echo before ATE0
    if (line === "OK") return c.done(null, c.lines);
    if (line === "ERROR" || /^\+CM[SE] ERROR/.test(line)) return c.done(new Error(`${c.command}: ${line}`), c.lines);
    c.lines.push(line);
  }

  /** Sends one AT command and resolves with its response lines (without the final OK). */
  command(command, timeoutMs = 5000) {
    const run = () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.current = null;
          reject(Object.assign(new Error(`${command}: timeout`), { timeout: true }));
        }, timeoutMs);
        this.current = {
          command,
          echo: command,
          lines: [],
          done: (err, lines) => {
            clearTimeout(timer);
            this.current = null;
            err ? reject(err) : resolve(lines);
          },
        };
        this.out.write(command + "\r");
      });
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => {});
    return result;
  }
}

/** "+CMGR: 1,,155" / "+CMGL: 3,1,,155" followed by the PDU line → [{ index, pdu }]. */
export function parseStoredMessages(lines, readIndex) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const list = /^\+CMGL:\s*(\d+),/.exec(lines[i]);
    const one = /^\+CMGR:/.test(lines[i]);
    if ((list || one) && lines[i + 1] && /^[0-9A-Fa-f]+$/.test(lines[i + 1])) {
      out.push({ index: list ? Number(list[1]) : readIndex, pdu: lines[i + 1] });
      i++;
    }
  }
  return out;
}
