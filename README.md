# prosemirror-highlightjs

## Usage

```js
import hljs from "highlight.js/lib/core";
import { highlightPlugin } from "prosemirror-highlightjs";

let state = new EditorView(..., {
  state: EditorState.create({
    doc: ...,
    plugins: [highlightPlugin(hljs)],
  })
});
```

Or import just the decoration parser and write your own plugin:

```js
import { getHighlightDecorations } from "prosemirror-highlightjs";

let plugin = new Plugin({
    state: {
        init(config, instance) {
            let content = getHighlightDecorations(
                instance.doc,
                hljs,
                blockTypes,
                languageExtractor
            );
            return DecorationSet.create(instance.doc, content);
        },
        apply(tr, set) {
            if (!tr.docChanged) {
                return set.map(tr.mapping, tr.doc);
            }

            let content = getHighlightDecorations(
                tr.doc,
                hljs,
                blockTypes,
                languageExtractor
            );
            return DecorationSet.create(tr.doc, content);
        },
    },
    props: {
        decorations(state) {
            return this.getState(state);
        },
    },
});
```

## Theming considerations

Due to how ProseMirror renders decorations, some existing highlight.js themes might not work as expected.
ProseMirror collapses all nested/overlapping decoration structures, causing a structure such as
`.hljs-function > (.hljs-keyword + .hljs-title)` to instead render as `.hljs-function.hljs-keyword + .hljs-function.hljs.title`.
