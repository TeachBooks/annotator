import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Define __dirname since it's not available in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
    mode: 'production',
    entry: './src/content/contentScript.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'contentScript.bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
    },
};
