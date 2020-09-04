/// <reference types="highlight.js" />
import { Node as ProseMirrorNode } from "prosemirror-model";
import { Plugin, Transaction } from "prosemirror-state";
import type { Mapping } from "prosemirror-transform";
import { Decoration, DecorationSet } from "prosemirror-view";
import { getHighlightDecorations } from "./getHighlightDecorations";

// TODO `map` is not actually part of the exposed api for Decoration,
// so we have to add our own type definitions to expose it
declare module "prosemirror-view" {
    interface Decoration<T> {
        map: (
            mapping: Mapping,
            offset: number,
            oldOffset: number
        ) => Decoration<T>;
    }
}

/** Describes the current state of the highlightPlugin  */
export interface HighlightPluginState {
    cache: DecorationCache;
    decorations: DecorationSet;
}

/** Represents a cache of doc positions to the node and decorations at that position */
export class DecorationCache {
    private cache: {
        [pos: number]: { node: ProseMirrorNode; decorations: Decoration[] };
    };

    constructor(cache: {
        [pos: number]: { node: ProseMirrorNode; decorations: Decoration[] };
    }) {
        this.cache = { ...cache };
    }

    /**
     * Gets the cache entry at the given doc position, or null if it doesn't exist
     * @param pos The doc position of the node you want the cache for
     */
    get(pos: number): { node: ProseMirrorNode; decorations: Decoration[] } {
        return this.cache[pos] || null;
    }

    /**
     * Sets the cache entry at the given position with the give node/decoration values
     * @param pos The doc position of the node to set the cache for
     * @param node The node to place in cache
     * @param decorations The decorations to place in cache
     */
    set(pos: number, node: ProseMirrorNode, decorations: Decoration[]): void {
        this.cache[pos] = { node, decorations };
    }

    /**
     * Removes the value at the oldPos (if it exists) and sets the new position to the given values
     * @param oldPos The old node position to overwrite
     * @param newPos The new node position to set the cache for
     * @param node The new node to place in cache
     * @param decorations The new decorations to place in cache
     */
    replace(
        oldPos: number,
        newPos: number,
        node: ProseMirrorNode,
        decorations: Decoration[]
    ): void {
        this.remove(oldPos);
        this.set(newPos, node, decorations);
    }

    /**
     * Removes the cache entry at the given position
     * @param pos The doc position to remove from cache
     */
    remove(pos: number): void {
        delete this.cache[pos];
    }

    /**
     * Invalidates the cache by removing all decoration entries on nodes that have changed,
     * updating the positions of the nodes that haven't and removing all the entries that have been deleted;
     * NOTE: this does not affect the current cache, but returns an entirely new one
     * @param tr A transaction to map the current cache to
     */
    invalidate(tr: Transaction): DecorationCache {
        const returnCache = new DecorationCache(this.cache);
        const mapping = tr.mapping;
        Object.keys(this.cache).forEach((k) => {
            const pos = +k;
            const result = mapping.mapResult(pos);
            const mappedNode = tr.doc.nodeAt(result.pos);
            const { node, decorations } = this.get(pos);

            if (result.deleted || !mappedNode?.eq(node)) {
                returnCache.remove(pos);
            } else if (pos !== result.pos) {
                // update the decorations' from/to values to match the new node position
                const updatedDecorations = decorations
                    .map((d) => d.map(mapping, 0, 0))
                    .filter((d) => d !== null);
                returnCache.replace(
                    pos,
                    result.pos,
                    mappedNode,
                    updatedDecorations
                );
            }
        });

        return returnCache;
    }
}

/**
 * Creates a plugin that highlights the contents of all nodes (via Decorations) with a type passed in blockTypes
 * @param hljs The pre-configured instance of highlightjs to use for parsing
 * @param nodeTypes An array containing all the node types to target for highlighting
 * @param languageExtractor A method that is passed a prosemirror node and returns the language string to use when highlighting that node; defaults to using `node.attrs.params`
 */
export function highlightPlugin(
    hljs: HLJSApi,
    nodeTypes: string[] = ["code_block"],
    languageExtractor?: (node: ProseMirrorNode) => string
): Plugin<HighlightPluginState> {
    const extractor =
        languageExtractor ||
        function (node: ProseMirrorNode) {
            const params = node.attrs.params as string;
            return params?.split(" ")[0] || "";
        };

    return new Plugin<HighlightPluginState>({
        state: {
            init(_, instance) {
                const cache = new DecorationCache({});
                const content = getHighlightDecorations(
                    instance.doc,
                    hljs,
                    nodeTypes,
                    extractor,
                    undefined,
                    (b, pos, decorations) => {
                        cache.set(pos, b, decorations);
                    }
                );
                return {
                    cache: cache,
                    decorations: DecorationSet.create(instance.doc, content),
                };
            },
            apply(tr, data) {
                const updatedCache = data.cache.invalidate(tr);
                if (!tr.docChanged) {
                    return {
                        cache: updatedCache,
                        decorations: data.decorations.map(tr.mapping, tr.doc),
                    };
                }

                const content = getHighlightDecorations(
                    tr.doc,
                    hljs,
                    nodeTypes,
                    extractor,
                    (_, pos) => updatedCache.get(pos)?.decorations,
                    (b, pos, decorations) => {
                        updatedCache.set(pos, b, decorations);
                    }
                );

                return {
                    cache: updatedCache,
                    decorations: DecorationSet.create(tr.doc, content),
                };
            },
        },
        props: {
            decorations(state) {
                return this.getState(state).decorations;
            },
        },
    });
}