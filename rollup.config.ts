import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';
// import nodePolyfills from 'rollup-plugin-polyfill-node';
import nodeResolve from '@rollup/plugin-node-resolve';

const name = 'dhive-sl';

const bundle = (config) => ({
    ...config,
    input: 'src/index.ts',
    external: (id) => !/^[./]/.test(id),
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
    // // TODO: Not yet fully working with polyfills
    // bundle({
    //     external: ['buffer'],
    //     plugins: [
    //         nodePolyfills({
    //             include: ['buffer', 'stream', 'events', 'assert'],
    //         }),
    //         nodeResolve({
    //             browser: true,
    //             preferBuiltins: false,
    //         }),
    //         ,
    //         esbuild({ minify: false }),
    //     ],
    //     output: [
    //         {
    //             name: 'dhiveSL',
    //             file: `dist/${name}.esm.browser.js`,
    //             format: 'es',
    //             sourcemap: true,
    //         },
    //         {
    //             name: 'dhiveSL',
    //             file: `dist/${name}.umd.js`,
    //             format: 'umd',
    //             sourcemap: true,
    //             globals: {
    //                 buffer: '_buffer',
    //                 stream: 'stream',
    //                 bytebuffer: 'bytebuffer',
    //                 assert: 'assert',
    //                 crypto: 'crypto',
    //                 secp256k1: 'secp256k1',
    //                 bs58: 'bs58',
    //                 ecurve: 'ecurve',
    //                 bigi: 'bigi',
    //                 jsbi: 'jsbi',
    //                 fs: 'fs',
    //                 verror: 'verror',
    //                 'secure-random': 'secureRandom',
    //                 'browserify-aes': 'browserifyAes',
    //                 'cross-fetch': 'crossFetch',
    //             },
    //         },
    //     ],
    // }),
    bundle({
        plugins: [dts()],
        output: {
            file: `dist/${name}.d.ts`,
            format: 'es',
        },
    }),
];
