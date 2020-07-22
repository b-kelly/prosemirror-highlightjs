import { highlightPlugin } from "../src/index";
import { schema } from "../src/sample-schema";
import hljs from "highlight.js/lib/core";
import { EditorState } from "prosemirror-state";
import { DOMParser } from "prosemirror-model";
import { DecorationSet } from "prosemirror-view";

hljs.registerLanguage(
    "javascript",
    require("highlight.js/lib/languages/javascript")
);

hljs.registerLanguage(
    "csharp",
    require("highlight.js/lib/languages/csharp")
);

hljs.registerAliases("js_alias", {
    languageName: "javascript"
});

function createStateImpl(input: { code: string, language?: string }[], addPlugins = true) {
    const doc = document.createElement("div");

    doc.innerHTML = input.reduce((p, n) => {
        return p + `<pre data-params="${n.language || ""}"><code>${n.code}</code></pre>`;
    }, "");

    return EditorState.create({
        doc: DOMParser.fromSchema(schema).parse(doc),
        schema: schema,
        plugins: addPlugins ? [highlightPlugin(hljs)] : []
    });
}

function createState(code: string, language?: string, addPlugins = true) {
    return createStateImpl([
        {
            code,
            language
        }
    ], addPlugins);
}

describe("sample-schema", () => {
    it.each(["", "javascript"])("should create a schema with the proper attrs (%s) set", (language) => {
        const code = `console.log("hello world");`;
        let state = createState(code, language, false);

        // expect the doc to be a specific shape
        expect(state.doc.childCount).toBe(1);
        expect(state.doc.child(0).type.name).toBe("code_block");
        expect(state.doc.child(0).attrs.params).toBe(language);
        expect(state.doc.child(0).childCount).toBe(1);
        expect(state.doc.child(0).child(0).isText).toBe(true);
        expect(state.doc.child(0).child(0).text).toBe(code);
    });

    it("should create multiple nodes", () => {
        const state = createStateImpl([
            {
                code: `console.log("hello world");`,
                language: "javascript"
            },
            {
                code: `Debug.Log("hello world");`,
                language: "csharp"
            }
        ]);

        expect(state.doc.childCount).toBe(2);
        expect(state.doc.child(0).type.name).toBe("code_block");
        expect(state.doc.child(0).attrs.params).toBe("javascript");
        expect(state.doc.child(1).type.name).toBe("code_block");
        expect(state.doc.child(1).attrs.params).toBe("csharp");
    })
});

describe("highlightPlugin", () => {
    it.each([
        ["should highlight with loaded language", "javascript"],
        ["should auto-highlight with loaded language", undefined],
        ["should highlight on aliased loaded language", "js_alias"]
    ])("%s", (_, language) => {
        const state = createState(`console.log("hello world");`, language);

        const pluginState: DecorationSet = state.plugins[0].getState(state);

        // the decorations should be loaded
        expect(pluginState).not.toBe(DecorationSet.empty);

        // TODO try and check the actual content of the decorations
    });

    it("should skip highlighting on invalid/not loaded language", () => {
        const state = createState(`console.log("hello world");`, "fake_language");

        const pluginState: DecorationSet = state.plugins[0].getState(state);

        // the decorations should NOT be loaded
        expect(pluginState).toBe(DecorationSet.empty);
    });

    it("should highlight multiple nodes", () => {
        const state = createStateImpl([
            {
                code: `console.log("hello world");`,
                language: "javascript"
            },
            {
                code: `just some text`,
                language: "plaintext"
            },
            {
                code: `Debug.Log("hello world");`,
                language: "csharp"
            }
        ]);

        const pluginState: DecorationSet = state.plugins[0].getState(state);

        // the decorations should NOT be loaded
        expect(pluginState).not.toBe(DecorationSet.empty);

        // TODO try and check the actual content of the decorations
    });
});