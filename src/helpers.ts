import { Node as ProseMirrorNode } from "prosemirror-model";

/**
 * Gets all nodes with a type in nodeTypes from a document
 * @param doc The document to search
 * @param nodeTypes The types of nodes to get
 */
export function getNodesOfType(doc: ProseMirrorNode, nodeTypes: string[]): { node: ProseMirrorNode, pos: number }[] {
    let blocks: { node: ProseMirrorNode, pos: number }[] = [];
    doc.descendants((child, pos) => {
        if (child.isBlock && nodeTypes.indexOf(child.type.name) > -1) {
            blocks.push({
                node: child,
                pos: pos,
            });

            return false;
        }

        return;
    });

    return blocks;
}