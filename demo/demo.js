import hljs from "highlight.js/lib/core";
import "highlight.js/styles/solarized-dark.css";
import { baseKeymap } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { DOMParser, Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import "prosemirror-view/style/prosemirror.css";
import { highlightPlugin } from "../src/index";
import { schema } from "../src/sample-schema";
import "./demo.css";

hljs.registerLanguage(
    "javascript",
    require("highlight.js/lib/languages/javascript")
);

var extendedSchema = new Schema({
    nodes: {
        doc: {
            content: "block+",
        },
        text: {
            group: "inline",
        },
        code_block: {
            ...schema.nodes.code_block.spec,
            toDOM(node) {
                return [
                    "pre",
                    { "data-params": node.attrs.params, class: "hljs" },
                    ["code", 0],
                ];
            },
        },
        paragraph: {
            content: "inline*",
            group: "block",
            parseDOM: [{ tag: "p" }],
            toDOM() {
                return ["p", 0];
            },
        },
    },
    marks: {},
});

let content = document.querySelector("#content");

// create our prosemirror document and attach to window for easy local debugging
window.view = new EditorView(document.querySelector("#editor"), {
    state: EditorState.create({
        doc: DOMParser.fromSchema(extendedSchema).parse(content),
        schema: extendedSchema,
        plugins: [
            keymap(baseKeymap),
            keymap({
                // pressing TAB (naively) inserts four spaces in code_blocks
                Tab: (state, dispatch) => {
                    let { $head } = state.selection;
                    if (!$head.parent.type.spec.code) {
                        return false;
                    }
                    if (dispatch) {
                        dispatch(state.tr.insertText("    ").scrollIntoView());
                    }

                    return true;
                },
            }),
            highlightPlugin(hljs),
        ],
    }),
});

// highlight our "static" version to compare
let clone = document.querySelector("#content-clone");
clone.innerHTML = content.querySelector("pre").outerHTML;
hljs.highlightBlock(clone.querySelector("pre code"));
