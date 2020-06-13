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
  kind: string,
  classes: string
};

export function highlightPlugin(hljs: HLJSApi, blockTypes?: string[], languageExtractor?: (node: ProseMirrorNode) => string) {
  blockTypes = blockTypes || ["code_block"];
  languageExtractor = languageExtractor || function (node) {
    return node.attrs.params?.split(" ")[0] || "";
  };

  return new Plugin({
    state: {
      init(config, instance) {
        let content = getHighlightDecorations(instance.doc, hljs, blockTypes, languageExtractor);
        return DecorationSet.create(instance.doc, content);
      },
      apply(tr, set) {
        if (!tr.docChanged) {
          return set.map(tr.mapping, tr.doc);
        }

        let content = getHighlightDecorations(tr.doc, hljs, blockTypes, languageExtractor);
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
 * @param blockTypes The blocktypes that contain text to highlight
 * @param languageExtractor Function that takes a node and returns the language to use when highlighting
 */
function getHighlightDecorations(doc: ProseMirrorNode, hljs: HLJSApi, blockTypes: string[], languageExtractor: (node: ProseMirrorNode) => string) {
  let blocks: { node: ProseMirrorNode, pos: number }[] = [];
  doc.descendants((child, pos) => {
    if (child.isBlock && blockTypes.indexOf(child.type.name) > -1) {
      blocks.push({
        node: child,
        pos: pos,
      });

      return false;
    }
  });

  let decorations: Decoration[] = [];

  blocks.forEach(b => {
    let language = languageExtractor(b.node);
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

export class ProseMirrorRenderer implements Renderer {
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
    let className = node.kind;
    if (!node.sublanguage) className = `${this.classPrefix}${className}`;

    let item = this.newNode();
    item.kind = node.kind;
    item.classes = className;
    item.from = this.currentPosition;

    this.nodeQueue.push(item);
  }

  closeNode(node: DataNode) {
    let item = this.nodeQueue.pop();
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
      kind: null,
      classes: "",
    };
  }
}
