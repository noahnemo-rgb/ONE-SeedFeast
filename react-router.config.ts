import type { Config } from '@react-router/dev/config';

export default {
	appDirectory: './src/app',
	ssr: true,
	// "/*?" is not a URL. React Router requests it literally, and the "?"
	// makes the prerender data response fail to decode.
	prerender: ['/'],
} satisfies Config;
