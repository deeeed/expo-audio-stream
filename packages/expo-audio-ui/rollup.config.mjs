import terser from '@rollup/plugin-terser' // Import terser plugin
import typescript from '@rollup/plugin-typescript'
import url from '@rollup/plugin-url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const packageJson = require('./package.json')

export default {
    input: 'src/index.ts',
    external: [...Object.keys(packageJson.peerDependencies || {})],
    output: [
        {
            file: packageJson.main,
            format: 'cjs', // CommonJS format for Node.js compatibility
            sourcemap: true,
        },
        {
            file: packageJson.module,
            format: 'es', // ES module format for modern JavaScript bundlers
            sourcemap: true,
        },
    ],
    plugins: [
        typescript({ tsconfig: './tsconfig.build.json' }),
        terser(), // Minify the bundle
        url({
            include: ['**/*.ttf', '**/*.woff', '**/*.woff2'], // only work with font files
            emit: 0, // always emit files
            emitFiles: true, // emit files to the output directory
            fileName: '[dirname][name][extname]', // use hash to avoid name conflicts
        }),
    ],
}
