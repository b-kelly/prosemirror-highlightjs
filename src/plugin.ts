import "highlight.js";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { getHighlightDecorations } from "./getHighlightDecorations";
import { DecorationSet } from "prosemirror-view";

/**
 * Creates a plugin that highlights the contents of all nodes (via Decorations) with a type passed in blockTypes
 * @param hljs The pre-configured instance of highlightjs to use for parsing
 * @param nodeTypes An array containing all the node types to target for highlighting
 * @param languageExtractor A method that is passed a prosemirror node and returns the language string to use when highlighting that node; defaults to using `node.attrs.params`
 */
export function highlightPlugin(hljs: HLJSApi, nodeTypes: string[] = ["code_block"], languageExtractor?: (node: ProseMirrorNode) => string) {
    nodeTypes = nodeTypes;

    const extractor = languageExtractor || function (node: ProseMirrorNode) {
        return node.attrs.params?.split(" ")[0] || "";
    };

    return new Plugin({
        state: {
            init(_, instance) {
                let content = getHighlightDecorations(instance.doc, hljs, nodeTypes, extractor);
                return DecorationSet.create(instance.doc, content);
            },
            apply(tr, set, oldState) {
                if (!tr.docChanged) {
                    return set.map(tr.mapping, tr.doc);
                }

                let content = getHighlightDecorations(tr.doc, hljs, nodeTypes, extractor);
                return DecorationSet.create(tr.doc, content);
            },
        },
        props: {
            decorations(state) {
                return this.getState(state);
            },
        },
    });
}