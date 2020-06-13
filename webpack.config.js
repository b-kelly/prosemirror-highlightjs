const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    libraryTarget: "commonjs"
  },
  externals: ["prosemirror-state", "prosemirror-view", "highlight.js"],
};
