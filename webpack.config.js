const path = require('path');

module.exports = {
    // 実際に存在するファイルへのパスに変更（例：拡張機能のメインファイル）
    entry: './src/extension.ts',
    output: {
        path: path.resolve(__dirname, 'out'),  // VSCode拡張機能の標準出力ディレクトリ
        filename: 'extension.js',               // 出力ファイル名
        libraryTarget: 'commonjs2'              // VSCode拡張機能に適した形式
    },
    devtool: 'source-map',
    externals: {
        vscode: 'commonjs vscode'               // VSCodeモジュールを外部依存として扱う
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    target: 'node'
};