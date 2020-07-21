import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { DOMParser } from "prosemirror-model";
import hljs from "highlight.js/lib/core";
import { highlightPlugin } from "../src/index";
import { schema } from "../src/sample-schema";

hljs.registerLanguage(
    "javascript",
    require("highlight.js/lib/languages/javascript")
);

import "highlight.js/styles/solarized-dark.css";
import "prosemirror-view/style/prosemirror.css";
import "./demo.css";

// set the code block as unselectable since we don't want ctrl+a to delete the single root node
schema.nodes["code_block"].selectable = false;

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
