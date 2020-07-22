import { Schema } from "prosemirror-model";

/**
 * Sample schema to show how a code_block node would look like for use with the default plugin settings;
 * not included in the `index` bundle purposefully since this was mostly just created for tests/demo purposes
 */
export const schema = new Schema({
    nodes: {
        doc: {
            content: "code_block+",
        },
        text: {
            group: "inline",
        },
        code_block: {
            content: "text*",
            group: "block",
            code: true,
            defining: true,
            marks: "",
            attrs: { params: { default: "" } },
            parseDOM: [{
                tag: "pre",
                preserveWhitespace: "full",
                getAttrs: node => ({
                    // TODO support (string | Node) type
                    params: (<any>node).getAttribute("data-params") || ""
                })
            }],
            toDOM(node) {
                return [
                    "pre",
                    { "data-params": node.attrs.params },
                    ["code", 0]
                ]
            }
        },
    },
    marks: {},
});