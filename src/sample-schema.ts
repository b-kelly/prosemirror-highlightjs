import { Schema, Node } from "prosemirror-model";

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
            attrs: {
                params: { default: "" },
                detectedHighlightLanguage: { default: "" },
            },
            parseDOM: [
                {
                    tag: "pre",
                    preserveWhitespace: "full",
                    getAttrs: (node: HTMLElement | string) => ({
                        params:
                            (<Element>node)?.getAttribute("data-params") || "",
                    }),
                },
            ],
            toDOM(node: Node) {
                return [
                    "pre",
                    { "data-params": node.attrs.params as string },
                    ["code", 0],
                ];
            },
        },
    },
    marks: {},
});
