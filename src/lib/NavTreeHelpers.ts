import { BlockStore } from "./BlockStore";
import { getKeywords, getTfIdf, getTopNKeywords } from "./Keywords";
import { NavTree, csim, type NavTreeNode } from "./NavTree";

const NUM_KEYWORDS = 5;
const UNTITLED_SUBLIST_NAME = "Untitled Sublist";

export function printTree(store: BlockStore, 
                          tree: NavTree, 
                          currNode: NavTreeNode,
                          title: string, 
                          depth: string): string {

    let sortedChildren = [...currNode.children].sort((a, b) => sortNodes(store, currNode, a, b));

    // base case: it's a block
    if (currNode.children.length == 0) {
        return depth + "- " + store.getByEmbedding(currNode.embedding)?.text.trim() + "\n";

    // recursive case: it's a cluster
    } else {
        let clusterStr = "";
        if (currNode.embedding.length > 0) {                 // not root?
            clusterStr += depth + "- " + title + "\n";
            depth = depth + "\t";
        }

        let titles = getTitles(store, node => tree.getDescendants(node), sortedChildren);
        for (let i = 0; i < sortedChildren.length; i++) {
            clusterStr += printTree(store, tree, sortedChildren[i], titles[i], depth);
        }
        return clusterStr;
    }
}

// given a blockstore, function to find descendant embeddings, and a cluster node's children,
// generate titles for the cluster node's children.
export function getTitles(store: BlockStore, 
                          descFunc: (node: NavTreeNode) => number[][], 
                          children: NavTreeNode[]): string[] {
    if (children.length == 0)
        return [];

    let freq_matrix = [];

    for (let i = 0; i < children.length; i++) {
        
        // block
        if (children[i].children.length == 0) {
            let block = store.getByEmbedding(children[i].embedding);
            if (block) freq_matrix.push(block.keywords);
        
        // cluster
        } else {
            let largetext = "";

            let descendants = descFunc(children[i]);
            for (let j = 0; j < descendants.length; j++) {
                let block = store.getByEmbedding(descendants[j]);
                if (block) largetext += " " + block.text;
            }

            freq_matrix.push(getKeywords(largetext));
        }
    }

    let titles = getTfIdf(freq_matrix, false).map(
        arr => arr.slice(0, NUM_KEYWORDS).map(([a, b]) => a)
    );
    return titles.map(keywords => keywords.length > 0 ? keywords.join(", ") : UNTITLED_SUBLIST_NAME);
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