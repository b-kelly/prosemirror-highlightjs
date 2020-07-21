const path = require("path");

module.exports = {
    mode: "production",
    entry: {
        index: "./src/index.ts",
        "sample-schema": "./src/sample-schema.ts",
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js",
        libraryTarget: "commonjs",
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    externals: [
        "prosemirror-model",
        "prosemirror-state",
        "prosemirror-view",
        "highlight.js",
    ],
};
