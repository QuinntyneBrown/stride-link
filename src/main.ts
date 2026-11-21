// Composition root: wires the Bluetooth adapter, session core and UI together.
import { BluetoothGateway } from "./ble/bluetooth-gateway.ts";
import { buildInfo } from "./build-info.ts";
import { RunController } from "./session/run-controller.ts";
import { AppShell } from "./ui/app-shell.ts";

const controller = new RunController(BluetoothGateway.fromNavigator());
new AppShell(document, controller).mount(buildInfo);
void controller.boot();
