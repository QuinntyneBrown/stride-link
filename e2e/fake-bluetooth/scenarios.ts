// Fake treadmills that reach each verdict, shared by the belt specs.
import type { FakeOverrides } from "./install.ts";
import { F } from "./frames.ts";

/** Replies to init with a D3 of 0 km/h and never challenges: Talks. */
export const talks: FakeOverrides = {
  replies: [{ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f4", hex: F.D3_ZERO, delayMs: 20 }] }],
};

/** Challenges once and acknowledges: Unlocked. */
export const unlocked: FakeOverrides = {
  replies: [
    { whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex: F.CHALLENGE, delayMs: 20 }] },
    { whenHexStartsWith: "F0 E0 00 00", once: true, notify: [{ char: "f3", hex: F.ACK_57, delayMs: 100 }] },
  ],
};

/** Challenges once and never acknowledges: Locked. */
export const locked: FakeOverrides = {
  replies: [{ whenHexStartsWith: F.A4, once: true, notify: [{ char: "f3", hex: F.CHALLENGE, delayMs: 20 }] }],
};

/** Never notifies: Silent after 20 s. */
export const silent: FakeOverrides = {};

/** Time from Connect until each scenario's verdict is certainly shown. */
export const UNTIL_VERDICT_MS = 7_000;
export const UNTIL_SILENT_MS = 25_000;

/** The Stride 4 variant, chosen by name (L2-008). */
export const stride4: FakeOverrides = { deviceName: "STRIDE4-ABC" };
export const chooserCancel: FakeOverrides = { chooser: "NotFoundError" };
export const bikeRejected: FakeOverrides = { deviceName: "ECH-SPORT-1234" };
export const connectTimeout: FakeOverrides = { connect: "hang" };
export const missingService: FakeOverrides = { service: false };
export const subscribeFailure: FakeOverrides = { subscribeFailure: "f4" };
export const writeFailure: FakeOverrides = { failWrites: [2] };
/** Talks, then the treadmill drops the link 4 s after the tenth write settles. */
export const midRunDisconnect: FakeOverrides = { ...talks, disconnectAfterWrite: { write: 10, delayMs: 4_000 } };
