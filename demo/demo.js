import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import hljs from "highlight.js/lib/core";
import { highlightPlugin } from "../src/index";

hljs.registerLanguage(
  "javascript",
  require("highlight.js/lib/languages/javascript")
);

import "highlight.js/styles/solarized-dark.css";
import "prosemirror-view/style/prosemirror.css";
import "./demo.css";

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const schema = new Schema({
  nodes: {
    doc: {
      content: "code_block+",
    },
    text: {
      group: "inline",
    },
    code_block: {
      content: "text*",
      marks: "",
      group: "block",
      selectable: false,
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM() {
        return ["pre", { class: "hljs" }, ["code", 0]];
      },
    },
  },
  marks: {},
});

let content = document.querySelector("#content");

// create our prosemirror document
window.view = new EditorView(document.querySelector("#editor"), {
  state: EditorState.create({
    doc: DOMParser.fromSchema(schema).parse(content),
    plugins: [highlightPlugin(hljs)],
  }),
});

// highlight our "static" version to compare
let clone = document.querySelector("#content-clone");
clone.innerHTML = content.innerHTML;
clone.querySelector("code").innerHTML = hljs.highlight(
  "javascript",
  content.textContent
).value;
