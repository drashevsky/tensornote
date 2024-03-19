import { BlockStore } from "./BlockStore";
import { getTfIdf, getTopNKeywords } from "./Keywords";
import { NavTree, csim, type NavTreeNode } from "./NavTree";

const NUM_KEYWORDS = 5;
const UNTITLED_SUBLIST_NAME = "Untitled Sublist";

export function printTree(store: BlockStore, 
                          tree: NavTree, 
                          currNode: NavTreeNode, 
                          depth: string): string {

    let sortedChildren = [...currNode.children].sort((a, b) => sortNodes(store, currNode, a, b));

    // special case: root node
    if (currNode.embedding.length == 0) {
        let clusterStr = "";
        sortedChildren.forEach((child) => {
            clusterStr += printTree(store, tree, child, depth + "\t");
        });
        return clusterStr;
    }

    // base case: it's a block
    if (currNode.children.length == 0) {
        return depth + "- " + store.getByEmbedding(currNode.embedding)?.text.trim() + "\n";

    // recursive case: it's a cluster
    } else {
        let clusterStr = depth + "- " + getTitle(store, node => tree.getDescendants(node), currNode) + "\n";
        sortedChildren.forEach((child) => {
            clusterStr += printTree(store, tree, child, depth + "\t");
        });
        return clusterStr;
    }
}

// given a blockstore, function to find descendant embeddings, and a cluster node,
// generate a title for the cluster node.
export function getTitle(store: BlockStore, 
                         descFunc: (node: NavTreeNode) => number[][], 
                         node: NavTreeNode): string {
    if (node.children.length == 0 || node.embedding.length == 0)
        return UNTITLED_SUBLIST_NAME;
    
    let descendants = descFunc(node);
    let freq_matrix = [];

    for (let i = 0; i < descendants.length; i++) {
        let block = store.getByEmbedding(descendants[i]);
        if (block) freq_matrix.push(block.keywords);
    }

    let topKeywords = getTopNKeywords(getTfIdf(freq_matrix, false), NUM_KEYWORDS).map(([a, b]) => a);
    return topKeywords.length > 0 ? topKeywords.join(", ") : UNTITLED_SUBLIST_NAME;
}

// if both nodes are blocks, sort by timestamp. if both nodes are clusters, sort by distance
// to parent. otherwise, put clusters first.
export function sortNodes(store: BlockStore, parent: NavTreeNode, a: NavTreeNode, b: NavTreeNode) {
    let e1 = store.getByEmbedding(a.embedding);
    let e2 = store.getByEmbedding(b.embedding);
    let p_embedding = parent.embedding;

    if (e1 && e2) return e1.timestamp - e2.timestamp;                   // 2 blocks
    if (e1 || e2) return e1 ? 1 : -1;                                   // block/cluster
    if (p_embedding.length == 0) return 0;                              // root node item
    return (1 - csim(p_embedding, a.embedding)) -                       // 2 clusters
           (1 - csim(p_embedding, b.embedding));   
}