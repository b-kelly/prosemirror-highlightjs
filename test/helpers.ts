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

hljs.registerLanguage("python", require("highlight.js/lib/languages/python"));

hljs.registerLanguage("java", require("highlight.js/lib/languages/java"));

hljs.registerLanguage("xml", require("highlight.js/lib/languages/xml"));

hljs.registerAliases("js_alias", {
    languageName: "javascript",
});

export const hljsInstance = hljs;

function escapeHtml(html: string) {
    return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;");
}

export function createDoc(input: { code: string; language?: string }[]): Node {
    const doc = document.createElement("div");

    doc.innerHTML = input.reduce((p, n) => {
        return (
            p +
            `<pre data-params="${n.language || ""}"><code>${escapeHtml(
                n.code
            )}</code></pre>`
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

export const nativeVsPluginTests = [
    [
        "xml",
        `<!doctype html>
<head lang="en">
<style>
    #id-style {
        background-color: #efefef;
        padding: 12px 6px;
        width: 100%;
    }

    .class-style {
        position: absolute;
        top: 0;
    }

    @media screen and (aspect-ratio: 11/5) {
        .nested-style {
            invalid: property;
        }
    }
</style>
</head>
<body data-test="test attribute">
<!-- yikes -->
<blink>Hello world!</blink>
</body>
<script>
/* test comment 1 */
const x = (a, b) => true;
// test comment 2
var y = function() {
    console.log("Hello world");
};
</script>`,
    ],
    [
        "javascript",
        `function $initHighlight(block, cls) {
try {
    const x = true;
} catch (e) {
    /* handle exception */
}
for (var i = 0 / 2; i < classes.length; i++) {
    if (checkCondition(classes[i]) === undefined)
    console.log('undefined');
}

return;
}

export $initHighlight;`,
    ],
];
