import net from "node:net";
import { env } from "../config/env.js";

// EICAR is the standard harmless antivirus test string (split so this source file is not itself flagged).
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$" + "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

// Returns CLEAN | INFECTED | FAILED. Anything but CLEAN keeps the file unavailable.
export async function scan(buf) {
  if (env.SCAN_DRIVER === "clamav") return clamScan(buf);
  return buf.includes(EICAR) ? "INFECTED" : "CLEAN"; // dev only; production env validation requires clamav
}

function clamScan(buf) {
  return new Promise((resolve) => {
    const s = net.connect(env.CLAMAV_PORT, env.CLAMAV_HOST);
    let out = "";
    s.setTimeout(30000, () => { s.destroy(); resolve("FAILED"); });
    s.on("error", () => resolve("FAILED"));
    s.on("data", (d) => (out += d));
    s.on("close", () => resolve(out.includes("FOUND") ? "INFECTED" : /: OK/.test(out) ? "CLEAN" : "FAILED"));
    s.write("zINSTREAM\0");
    for (let i = 0; i < buf.length; i += 65536) {
      const chunk = buf.subarray(i, i + 65536);
      const len = Buffer.alloc(4); len.writeUInt32BE(chunk.length);
      s.write(len); s.write(chunk);
    }
    s.write(Buffer.alloc(4));
  });
}
