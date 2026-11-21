// Error name and message, whatever was thrown (L2-058).

export interface ErrorFacts {
  readonly name: string;
  readonly message: string;
}

export function errorFacts(error: unknown): ErrorFacts {
  if (typeof error === "object" && error !== null) {
    const { name, message } = error as { name?: unknown; message?: unknown };
    return {
      name: typeof name === "string" && name !== "" ? name : "Error",
      message: typeof message === "string" ? message : "(no message)",
    };
  }
  return { name: "Error", message: String(error) };
}
