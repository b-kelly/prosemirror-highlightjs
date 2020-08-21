/// <reference types="highlight.js" />
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Decoration } from "prosemirror-view";

/** TODO default emitter type for hljs */
interface TokenTreeEmitter extends Emitter {
    options: HLJSOptions;
    walk: (r: Renderer) => void;
}

type DataNode = { kind?: string; sublanguage?: boolean };

interface Renderer {
    addText: (text: string) => void;
    openNode: (node: DataNode) => void;
    closeNode: (node: DataNode) => void;
    value: () => any;
}

type RendererNode = {
    from: number;
    to: number;
    kind?: string;
    classes: string;
};

/**
 * Gets all nodes with a type in nodeTypes from a document
 * @param doc The document to search
 * @param nodeTypes The types of nodes to get
 */
function getNodesOfType(
    doc: ProseMirrorNode,
    nodeTypes: string[]
): { node: ProseMirrorNode; pos: number }[] {
    let blocks: { node: ProseMirrorNode; pos: number }[] = [];
    doc.descendants((child, pos) => {
        if (child.isBlock && nodeTypes.indexOf(child.type.name) > -1) {
            blocks.push({
                node: child,
                pos: pos,
            });

            return false;
        }

        return;
    });

    return blocks;
}

/**
 * Gets all highlighting decorations from a ProseMirror document
 * @param doc The doc to search applicable blocks to highlight
 * @param hljs The pre-configured highlight.js instance to use for parsing
 * @param nodeTypes An array containing all the node types to target for highlighting
 * @param languageExtractor A method that is passed a prosemirror node and returns the language string to use when highlighting that node
 * @param preRenderer A method that is passed the node (and doc position) that is about to render and is expected to return a Decoration[], which will cancel the render; useful for decoration caching on untouched nodes
 * @param postRenderer A method that is passed the node, position and rendered decorations; useful for decoration caching
 */
export function getHighlightDecorations(
    doc: ProseMirrorNode,
    hljs: HLJSApi,
    nodeTypes: string[],
    languageExtractor: (node: ProseMirrorNode) => string | null,
    preRenderer?: (block: ProseMirrorNode, pos: number) => Decoration[] | null,
    postRenderer?: (
        block: ProseMirrorNode,
        pos: number,
        decorations: Decoration[]
    ) => void
) {
    if (!doc || !doc.nodeSize || !nodeTypes?.length || !languageExtractor) {
        return [];
    }

    const blocks = getNodesOfType(doc, nodeTypes);

    let decorations: Decoration[] = [];

    blocks.forEach((b) => {
        // attempt to run the prerenderer if it exists
        if (preRenderer) {
            const prerenderedDecorations = preRenderer(b.node, b.pos);

            // if the returned decorations are non-null, use them instead of rendering our own
            if (prerenderedDecorations) {
                decorations = [...decorations, ...prerenderedDecorations];
                return;
            }
        }

        let language = languageExtractor(b.node);

        // if the langauge is specified, but isn't loaded, skip highlighting
        if (language && !hljs.getLanguage(language)) {
            return;
        }

        let result = language
            ? hljs.highlight(language, b.node.textContent)
            : hljs.highlightAuto(b.node.textContent);
        let emitter = result.emitter as TokenTreeEmitter;

        let renderer = new ProseMirrorRenderer(
            emitter as TokenTreeEmitter,
            b.pos,
            emitter.options.classPrefix
        );

        let value = renderer.value();

        let localDecorations: Decoration[] = [];
        value.forEach((v) => {
            if (!v.kind) {
                return;
            }

            let decoration = Decoration.inline(v.from, v.to, {
                class: v.classes,
            });

            localDecorations.push(decoration);
        });

        if (postRenderer) {
            postRenderer(b.node, b.pos, localDecorations);
        }

        decorations = [...decorations, ...localDecorations];
    });

    return decorations;
}

class ProseMirrorRenderer implements Renderer {
    private buffer: RendererNode[];
    private nodeQueue: RendererNode[];
    private classPrefix: string;
    private currentPosition: number;

    constructor(
        tree: TokenTreeEmitter,
        startingBlockPos: number,
        classPrefix: string
    ) {
        this.buffer = [];
        this.nodeQueue = [];
        this.classPrefix = classPrefix;
        this.currentPosition = startingBlockPos + 1;
        tree.walk(this);
    }

    get currentNode() {
        return this.nodeQueue.length ? this.nodeQueue.slice(-1) : null;
    }

    addText(text: string) {
        let node = this.currentNode;

        if (!node) {
            return;
        }

        this.currentPosition += text.length;
    }

    openNode(node: DataNode) {
        let className = node.kind || "";
        if (!node.sublanguage) className = `${this.classPrefix}${className}`;

        let item = this.newNode();
        item.kind = node.kind;
        item.classes = className;
        item.from = this.currentPosition;

        this.nodeQueue.push(item);
    }

    closeNode(node: DataNode) {
        let item = this.nodeQueue.pop();

        // will this ever happen in practice?
        // if the nodeQueue is empty, we have nothing to close
        if (!item) {
            throw "Cannot close node!";
        }

        item.to = this.currentPosition;

        // will this ever happen in practice?
        if (node.kind !== item.kind) {
            throw "Mismatch!";
        }

        this.buffer.push(item);
    }

    value() {
        return this.buffer;
    }

    private newNode(): RendererNode {
        return {
            from: 0,
            to: 0,
            kind: undefined,
            classes: "",
        };
    }
}
