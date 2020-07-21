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

Or just import the decoration parser and write your own plugin:

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

## Running locally

```
npm i
npm start
```

## Running tests

```
npm i
npm test
```
