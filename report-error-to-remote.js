export const sendLogsToRemote = async (logs) => {
  console.debug("SeedFeast kept logs on this device.", logs);
  return { success: false };
};

export const reportErrorToRemote = async ({ error }) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  console.debug("SeedFeast kept this error on this device.", message);
  return { success: false };
};
