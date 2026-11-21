// Composition root: wires the Bluetooth adapter, session core and UI together.
import { BluetoothGateway } from "./ble/bluetooth-gateway.ts";
import { buildInfo } from "./build-info.ts";
import { browserClock } from "./session/clock.ts";
import { PacketLog } from "./session/packet-log.ts";
import { RunController } from "./session/run-controller.ts";
import { AppShell } from "./ui/app-shell.ts";

interface UserAgentData {
  readonly brands: readonly { readonly brand: string; readonly version: string }[];
  readonly platform: string;
}

const uaData = (navigator as { userAgentData?: UserAgentData }).userAgentData;
const log = new PacketLog(browserClock);
const controller = new RunController({
  gateway: BluetoothGateway.fromNavigator(),
  log,
  clock: browserClock,
  env: {
    version: buildInfo.version,
    commit: buildInfo.commit,
    userAgent: navigator.userAgent,
    userAgentData: uaData ? { brands: uaData.brands.map((b) => `${b.brand} ${b.version}`).join(", "), platform: uaData.platform } : null,
  },
});
new AppShell(document, controller, log).mount(buildInfo);
void controller.boot();
