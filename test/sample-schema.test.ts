import { createState, createStateImpl } from "./helpers";

describe("sample-schema", () => {
    it.each(["", "javascript"])(
        "should create a schema with the proper attrs (%s) set",
        (language) => {
            const code = `console.log("hello world");`;
            const state = createState(code, language, false);

            // expect the doc to be a specific shape
            expect(state.doc.childCount).toBe(1);
            expect(state.doc.child(0).type.name).toBe("code_block");
            expect(state.doc.child(0).attrs.params).toBe(language);
            expect(state.doc.child(0).childCount).toBe(1);
            expect(state.doc.child(0).child(0).isText).toBe(true);
            expect(state.doc.child(0).child(0).text).toBe(code);
        }
    );

    it("should create multiple nodes", () => {
        const state = createStateImpl([
            {
                code: `console.log("hello world");`,
                language: "javascript",
            },
            {
                code: `Debug.Log("hello world");`,
                language: "csharp",
            },
        ]);

        expect(state.doc.childCount).toBe(2);
        expect(state.doc.child(0).type.name).toBe("code_block");
        expect(state.doc.child(0).attrs.params).toBe("javascript");
        expect(state.doc.child(1).type.name).toBe("code_block");
        expect(state.doc.child(1).attrs.params).toBe("csharp");
    });
});
