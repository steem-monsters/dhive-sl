// import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const name = 'dhive-sl';

const bundle = (config) => ({
    ...config,
    input: 'src/index.ts',
    external: (id) => !/^[./]/.test(id),
});

export default [
    bundle({
        plugins: [esbuild({ minify: true })],
        output: [
            {
                file: `dist/${name}.js`,
                format: 'cjs',
                sourcemap: true,
            },
            {
                file: `dist/${name}.mjs`,
                format: 'es',
                sourcemap: true,
            },
        ],
    }),
    // TODO: Not yet fully working with polyfills
    bundle({
        plugins: [nodePolyfills({ include: ['stream', 'assert'] }), esbuild({ minify: true })],
        output: [
            {
                name: 'dhiveSL',
                file: `dist/${name}.umd`,
                format: 'umd',
                sourcemap: true,
                globals: {
                    stream: 'stream',
                    bytebuffer: 'bytebuffer',
                    assert: 'assert',
                    crypto: 'crypto',
                    secp256k1: 'secp256k1',
                    bs58: 'bs58',
                    ecurve: 'ecurve',
                    bigi: 'bigi',
                    jsbi: 'jsbi',
                    fs: 'fs',
                    'splinterlands-hive-engine': 'splinterlandsHiveEngine',
                    verror: 'verror',
                    'secure-random': 'secureRandom',
                    'browserify-aes': 'browserifyAes',
                    'cross-fetch': 'crossFetch',
                },
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
