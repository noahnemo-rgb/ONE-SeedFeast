let sendLogsToRemote;
let reportErrorToRemote;

beforeEach(() => {
  jest.resetAllMocks();
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_LOGS_ENDPOINT;
  delete process.env.EXPO_PUBLIC_PROJECT_GROUP_ID;
  delete process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY;
  delete process.env.EXPO_PUBLIC_DEV_SERVER_ID;
  global.fetch = jest.fn();
  const mod = require('./report-error-to-remote');
  sendLogsToRemote = mod.sendLogsToRemote;
  reportErrorToRemote = mod.reportErrorToRemote;
});

describe('sendLogsToRemote', () => {
  it('keeps logs on the device when env vars are missing', async () => {
    const result = await sendLogsToRemote([{ message: 'test' }]);
    expect(result).toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not send logs when an external log endpoint is configured', async () => {
    process.env.EXPO_PUBLIC_LOGS_ENDPOINT = 'https://logs.example/ingest';
    process.env.EXPO_PUBLIC_PROJECT_GROUP_ID = 'pg-123';
    process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY = 'key-abc';

    const result = await sendLogsToRemote([{ message: 'hello' }]);
    expect(result).toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('reportErrorToRemote', () => {
  it('keeps the error on the device', async () => {
    process.env.EXPO_PUBLIC_LOGS_ENDPOINT = 'https://logs.example/ingest';
    process.env.EXPO_PUBLIC_PROJECT_GROUP_ID = 'pg-123';
    process.env.EXPO_PUBLIC_CREATE_TEMP_API_KEY = 'key-abc';

    const result = await reportErrorToRemote({ error: new Error('something broke') });
    expect(result).toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
