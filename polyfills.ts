import updatedFetch from './src/__create/fetch';
// @ts-expect-error -- updatedFetch wraps the native fetch with custom headers
global.fetch = updatedFetch;
