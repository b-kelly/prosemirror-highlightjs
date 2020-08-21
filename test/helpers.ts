/* eslint-disable @typescript-eslint/no-var-requires */
import hljs from "highlight.js/lib/core";
import { DOMParser, Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { highlightPlugin } from "../src/index";
import { schema } from "../src/sample-schema";

hljs.registerLanguage(
    "javascript",
    require("highlight.js/lib/languages/javascript")
);

hljs.registerLanguage("csharp", require("highlight.js/lib/languages/csharp"));

hljs.registerLanguage("java", require("highlight.js/lib/languages/java"));

hljs.registerAliases("js_alias", {
    languageName: "javascript",
});

export function createDoc(input: { code: string; language?: string }[]): Node {
    const doc = document.createElement("div");

    doc.innerHTML = input.reduce((p, n) => {
        return (
            p +
            `<pre data-params="${n.language || ""}"><code>${
                n.code
            }</code></pre>`
        );
    }, "");

    return DOMParser.fromSchema(schema).parse(doc);
}

export function createStateImpl(
    input: { code: string; language?: string }[],
    addPlugins = true
): EditorState {
    return EditorState.create({
        doc: createDoc(input),
        schema: schema,
        plugins: addPlugins ? [highlightPlugin(hljs)] : [],
    });
}

export function createState(
    code: string,
    language?: string,
    addPlugins = true
): EditorState {
    return createStateImpl(
        [
            {
                code,
                language,
            },
        ],
        addPlugins
    );
}
