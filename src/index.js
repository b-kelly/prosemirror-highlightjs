import { Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export function highlightPlugin(hljs, blockTypes) {
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

function getHighlightDecorations(doc, hljs, blockTypes) {
  let blocks = [];
  doc.descendants((child, pos) => {
    if (child.isBlock && blockTypes.includes(child.type.name)) {
      blocks.push({
        node: child,
        pos: pos,
      });

      return false;
    }
  });

  let decorations = [];

  blocks.forEach((b) => {
    let result = hljs.highlight("javascript", b.node.textContent);

    let renderer = new ProseMirrorRenderer(
      result.emitter,
      b.pos,
      result.emitter.options.classPrefix
    );

    let value = renderer.value();

    let localDecorations = [];
    value.forEach((v) => {
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

export class ProseMirrorRenderer {
  constructor(tree, startingBlockPos, classPrefix) {
    this.buffer = [];
    this.nodeQueue = [];
    this.classPrefix = classPrefix;
    this.currentPosition = startingBlockPos + 1;
    tree.walk(this);
  }

  get currentNode() {
    return this.nodeQueue.length ? this.nodeQueue.slice(-1) : null;
  }

  addText(text) {
    let node = this.currentNode;

    if (!node) {
      return;
    }

    this.currentPosition += text.length;
  }

  openNode(node) {
    let className = node.kind;
    if (!node.sublanguage) className = `${this.classPrefix}${className}`;

    let item = this._newNode();
    item.kind = node.kind;
    item.classes = className;
    item.from = this.currentPosition;

    this.nodeQueue.push(item);
  }

  closeNode(node) {
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

  _newNode() {
    return {
      from: 0,
      to: 0,
      kind: null,
      classes: "",
    };
  }
}
