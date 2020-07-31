import { DecorationSet } from "prosemirror-view";
import { createState, createStateImpl } from "./helpers";

describe("highlightPlugin", () => {
    it.each([
        ["should highlight with loaded language", "javascript"],
        ["should auto-highlight with loaded language", undefined],
        ["should highlight on aliased loaded language", "js_alias"]
    ])("%s", (_, language) => {
        const state = createState(`console.log("hello world");`, language);

        // TODO check all props?
        const pluginState: DecorationSet = state.plugins[0].getState(state).decorations;

        // the decorations should be loaded
        expect(pluginState).not.toBe(DecorationSet.empty);

        // TODO try and check the actual content of the decorations
    });

    it("should skip highlighting on invalid/not loaded language", () => {
        const state = createState(`console.log("hello world");`, "fake_language");

        // TODO check all props?
        const pluginState: DecorationSet = state.plugins[0].getState(state).decorations;

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

        // TODO check all props?
        const pluginState: DecorationSet = state.plugins[0].getState(state).decorations;

        // the decorations should NOT be loaded
        expect(pluginState).not.toBe(DecorationSet.empty);

        // TODO try and check the actual content of the decorations
    });
});
