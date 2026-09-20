export const isUniqueViolation = (error: unknown) => {
  let current: unknown = error;

  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const code = (current as { code?: unknown }).code;
    if (code === "23505") {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return false;
};
