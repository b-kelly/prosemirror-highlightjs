import hljs from "highlight.js/lib/core";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import type { Decoration } from "prosemirror-view";
import { getHighlightDecorations } from "../src";
import { createDoc } from "./helpers";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("java", java);

describe("getHighlightDecorations", () => {
    it("should do basic highlighting", () => {
        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljs,
            ["code_block"],
            (node) => {
                expect(node).not.toBeNull();
                expect(node.type.name).toBe("code_block");
                return "javascript";
            }
        );

        expect(decorations).toBeTruthy();
        expect(decorations).not.toHaveLength(0);
    });

    it("should be resilient to bad params", () => {
        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);

        // null doc
        // @ts-expect-error TS errors as we'd expect, but I want to simulate a JS consumer passing in bad vals
        let decorations = getHighlightDecorations(null, null, null, null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // null hljs
        // @ts-expect-error More errors...
        decorations = getHighlightDecorations(doc, null, null, null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // null nodeTypes
        // @ts-expect-error You guessed it...
        decorations = getHighlightDecorations(doc, hljs, null, null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty nodeTypes
        // @ts-expect-error Still...
        decorations = getHighlightDecorations(doc, hljs, [], null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty nodeTypes
        // @ts-expect-error Still...
        decorations = getHighlightDecorations(doc, hljs, [], null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty languageExtractor
        // @ts-expect-error Last one...
        decorations = getHighlightDecorations(doc, hljs, ["javascript"], null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);
    });

    it("should auto-highlight on an empty language", () => {
        const doc = createDoc([
            { code: `System.out.println("hello world!");` },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljs,
            ["code_block"],
            () => null
        );

        expect(decorations).toBeTruthy();
        expect(decorations).not.toHaveLength(0);
    });

    it("should cancel on non-null prerender", () => {
        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljs,
            ["code_block"],
            () => "javascript",
            (node, pos) => {
                expect(node).not.toBeNull();
                expect(node.type.name).toBe("code_block");
                expect(typeof pos === "number").toBe(true);
                return [];
            }
        );

        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);
    });

    it("should continue on null prerender", () => {
        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljs,
            ["code_block"],
            () => "javascript",
            () => null
        );

        expect(decorations).toBeTruthy();
        expect(decorations).not.toHaveLength(0);
    });

    it("should call postrender", () => {
        let renderedDecorations: Decoration[] = [];

        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljs,
            ["code_block"],
            () => "javascript",
            undefined,
            (node, pos, decos) => {
                expect(node).not.toBeNull();
                expect(node.type.name).toBe("code_block");
                expect(typeof pos === "number");

                renderedDecorations = decos;
            }
        );

        expect(decorations).toBeTruthy();
        expect(decorations).not.toHaveLength(0);
        expect(decorations).toEqual(renderedDecorations);
    });
});
