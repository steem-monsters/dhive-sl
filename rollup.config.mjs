import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';

const name = 'dhive-sl';

const bundle = (config) => ({
    ...config,
    input: path.resolve('src/index.ts'),
    external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
});

export default [
    bundle({
        plugins: [nodeResolve(), esbuild({ minify: true })],
        output: [
            {
                file: `dist/${name}.js`,
                format: 'cjs',
                sourcemap: true,
            },
            {
                file: `dist/${name}.esm.js`,
                format: 'es',
                sourcemap: true,
            },
        ],
    }),
    bundle({
        plugins: [dts()],
        output: {
            file: `dist/${name}.d.ts`,
            format: 'es',
        },
    }),
];
