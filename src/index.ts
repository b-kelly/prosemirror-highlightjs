import "highlight.js";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/** TODO default emitter type for hljs */
interface TokenTreeEmitter extends Emitter {
  options: HLJSOptions;
  walk: (r: Renderer) => void
}

type DataNode = { kind?: string, sublanguage?: boolean };

interface Renderer {
  addText: (text: string) => void,
  openNode: (node: DataNode) => void,
  closeNode: (node: DataNode) => void,
  value: () => any
};

type RendererNode = {
  from: number,
  to: number,
  kind?: string,
  classes: string
};

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
      apply(tr, set) {
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

/**
 * Gets all highlighting decorations from a ProseMirror document
 * @param doc The doc to search applicable blocks to highlight
 * @param hljs The pre-configured highlight.js instance to use for parsing
 * @param nodeTypes An array containing all the node types to target for highlighting
 * @param languageExtractor A method that is passed a prosemirror node and returns the language string to use when highlighting that node
 */
export function getHighlightDecorations(doc: ProseMirrorNode, hljs: HLJSApi, nodeTypes: string[], languageExtractor: (node: ProseMirrorNode) => string) {
  let blocks: { node: ProseMirrorNode, pos: number }[] = [];
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

  let decorations: Decoration[] = [];

  blocks.forEach(b => {
    let language = languageExtractor(b.node);

    // if the langauge is specified, but isn't loaded, skip highlighting
    if (language && !hljs.getLanguage(language)) {
      return;
    }

    let result = language ? hljs.highlight(language, b.node.textContent) : hljs.highlightAuto(b.node.textContent);
    let emitter = result.emitter as TokenTreeEmitter;

    let renderer = new ProseMirrorRenderer(
      emitter as TokenTreeEmitter,
      b.pos,
      emitter.options.classPrefix
    );

    let value = renderer.value();

    let localDecorations: Decoration[] = [];
    value.forEach(v => {
      if (!v.kind) {
        return;
      }

      let decoration = Decoration.inline(v.from, v.to, {
        class: v.classes,
      });

      localDecorations.push(decoration);
    });

    decorations = [...decorations, ...localDecorations];
  });

  return decorations;
}

class ProseMirrorRenderer implements Renderer {
  private buffer: RendererNode[];
  private nodeQueue: RendererNode[];
  private classPrefix: string;
  private currentPosition: number;

  constructor(tree: TokenTreeEmitter, startingBlockPos: number, classPrefix: string) {
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
