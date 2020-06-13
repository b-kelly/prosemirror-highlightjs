import "highlight.js";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export function highlightPlugin(hljs: HLJSApi, blockTypes: string[]) {
  blockTypes = blockTypes || ["code_block"];
  return new Plugin({
    state: {
      init(config, instance) {
        let content = getHighlightDecorations(instance.doc, hljs, blockTypes);
        return DecorationSet.create(instance.doc, content);
      },
      apply(tr, set) {
        if (!tr.docChanged) {
          return set.map(tr.mapping, tr.doc);
        }

        let content = getHighlightDecorations(tr.doc, hljs, blockTypes);
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

function getHighlightDecorations(doc: ProseMirrorNode, hljs: HLJSApi, blockTypes: string[]) {
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

  blocks.forEach((b) => {
    let result = hljs.highlight("javascript", b.node.textContent);

    let renderer = new ProseMirrorRenderer(
      result.emitter,
      b.pos,
      // @ts-ignore TODO
      result.emitter.options.classPrefix
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

type RendererNode = {
  from: number,
  to: number,
  kind: string,
  classes: string
};

export class ProseMirrorRenderer {
  private buffer: RendererNode[];
  private nodeQueue: RendererNode[];
  private classPrefix: string;
  private currentPosition: number;

  //TODO any
  constructor(tree: any, startingBlockPos: number, classPrefix: string) {
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

  openNode(node: RendererNode) {
    let className = node.kind;
    // @ts-ignore TODO
    if (!node.sublanguage) className = `${this.classPrefix}${className}`;

    let item = this.newNode();
    item.kind = node.kind;
    item.classes = className;
    item.from = this.currentPosition;

    this.nodeQueue.push(item);
  }

  closeNode(node: RendererNode) {
    let item = this.nodeQueue.pop();
    item.to = this.currentPosition;

    // TODO will this ever happen in practice?
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
