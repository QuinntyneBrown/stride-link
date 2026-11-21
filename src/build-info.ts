// Build-time constants, defined by scripts/build.ts (L2-004, L2-068).
declare const __STRIDE_LINK_VERSION__: string;
declare const __STRIDE_LINK_COMMIT__: string;
declare const __STRIDE_LINK_HOSTED_URL__: string;

export interface BuildInfo {
  readonly version: string;
  readonly commit: string;
  readonly hostedUrl: string;
}

export const buildInfo: BuildInfo = {
  version: __STRIDE_LINK_VERSION__,
  commit: __STRIDE_LINK_COMMIT__,
  hostedUrl: __STRIDE_LINK_HOSTED_URL__,
};
