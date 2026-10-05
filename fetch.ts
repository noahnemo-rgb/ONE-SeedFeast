const originalFetch = fetch;

export const fetchWithHeaders = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => originalFetch(input, init);

export default fetchWithHeaders;
