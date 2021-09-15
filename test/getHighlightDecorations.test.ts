/* eslint-disable @typescript-eslint/ban-ts-comment */
import { DOMParser, Schema } from "prosemirror-model";
import type { Decoration } from "prosemirror-view";
import { getHighlightDecorations } from "../src";
import {
    createDoc,
    escapeHtml,
    hljsInstance,
    nativeVsPluginTests,
} from "./helpers";

describe("getHighlightDecorations", () => {
    it("should do basic highlighting", () => {
        const doc = createDoc([
            { code: `console.log("hello world!");`, language: "javascript" },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljsInstance,
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
        decorations = getHighlightDecorations(doc, hljsInstance, null, null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty nodeTypes
        // @ts-expect-error Still...
        decorations = getHighlightDecorations(doc, hljsInstance, [], null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty nodeTypes
        // @ts-expect-error Still...
        decorations = getHighlightDecorations(doc, hljsInstance, [], null);
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);

        // empty languageExtractor
        decorations = getHighlightDecorations(
            doc,
            hljsInstance,
            ["javascript"],
            // @ts-expect-error Last one...
            null
        );
        expect(decorations).toBeTruthy();
        expect(decorations).toHaveLength(0);
    });

    it("should auto-highlight on an empty language", () => {
        const doc = createDoc([
            { code: `System.out.println("hello world!");` },
        ]);
        const decorations = getHighlightDecorations(
            doc,
            hljsInstance,
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
            hljsInstance,
            ["code_block"],
            () => "javascript",
            {
                preRenderer: (node, pos) => {
                    expect(node).not.toBeNull();
                    expect(node.type.name).toBe("code_block");
                    expect(typeof pos === "number").toBe(true);
                    return [];
                },
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
            hljsInstance,
            ["code_block"],
            () => "javascript",
            {
                preRenderer: () => null,
            }
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
            hljsInstance,
            ["code_block"],
            () => "javascript",
            {
                postRenderer: (node, pos, decos) => {
                    expect(node).not.toBeNull();
                    expect(node.type.name).toBe("code_block");
                    expect(typeof pos).toBe("number");

                    renderedDecorations = decos;
                },
            }
        );

        expect(decorations).toBeTruthy();
        expect(decorations).not.toHaveLength(0);
        expect(decorations).toEqual(renderedDecorations);
    });

    it("should call autohighlightCallback", () => {
        const doc = createDoc([{ code: `console.log("hello world!");` }]);

        let detectedLanguage: string | undefined = undefined;

        getHighlightDecorations(doc, hljsInstance, ["code_block"], () => null, {
            autohighlightCallback: (_, __, language) => {
                detectedLanguage = language;
            },
        });

        expect(detectedLanguage).toBe("javascript");
    });

    it.each([undefined, "javascript"])(
        "should call not autohighlightCallback (%s)",
        (language) => {
            const doc = createDoc([{ code: "", language }]);

            getHighlightDecorations(
                doc,
                hljsInstance,
                ["code_block"],
                () => null,
                {
                    autohighlightCallback: (_, __, ___) => {
                        throw "This should not have been called!";
                    },
                }
            );

            expect(true).toBeTruthy();
        }
    );

    it("should support highlighting the doc node itself", () => {
        const schema = new Schema({
            nodes: {
                text: {
                    group: "inline",
                },
                doc: {
                    content: "text*",
                },
            },
        });
        const element = document.createElement("div");
        element.innerHTML = escapeHtml(`console.log("hello world!");`);

        const doc = DOMParser.fromSchema(schema).parse(element);
        const decorations = getHighlightDecorations(
            doc,
            hljsInstance,
            ["doc"],
            () => "javascript"
        );

        expect(decorations).toBeTruthy();
        expect(Object.keys(decorations)).toHaveLength(3);
    });

    it.each(nativeVsPluginTests)(
        "should create the same decorations as a native highlightBlock call (%p)",
        (language, codeString) => {
            // get all the decorations generated by our prosemirror plugin
            const doc = createDoc([{ code: codeString, language: language }]);
            const decorations = getHighlightDecorations(
                doc,
                hljsInstance,
                ["code_block"],
                () => language
            )
                // decorations are not guaranteed to come back in sorted order, so sort by doc position
                .sort((a, b) => {
                    const sort = a.from - b.from;

                    // if one decoration exactly wraps another, the one that ends last is the "first"
                    // e.g. <span class="class1"><span class="class2">a</span>()</span> will sort as `class1, class2`
                    if (!sort) {
                        return b.to - a.to;
                    }

                    return sort;
                })
                // @ts-expect-error using internal apis here for convenience
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                .map((d) => d.type.attrs.class as string);

            // run the code through highlightjs and get all the "decorations" from it
            const hljsOutput = hljsInstance.highlight(codeString, {
                language,
            }).value;
            const container = document.createElement("pre");
            container.innerHTML = hljsOutput;
            const hljsDecorations = Array.from(
                container.querySelectorAll("span")
            ).map((d) => d.className);

            //expect(decorations.length).toBe(hljsDecorations.length);
            expect(decorations).toStrictEqual(hljsDecorations);
        }
    );
});
