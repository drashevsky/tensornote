import { defineConfig } from 'vitest/config';
//@ts-ignore
import rust from '@wasm-tool/rollup-plugin-rust';   // this is a js plugin so ts has trouble with it
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
        rust(),
        sveltekit()
    ],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
