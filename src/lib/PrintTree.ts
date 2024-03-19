import { BlockStore } from "./BlockStore";
import { NavTree, type NavTreeNode } from "./NavTree";

export function printTree(store: BlockStore, 
                          tree: NavTree, 
                          currNode: NavTreeNode, 
                          depth: string): string {
        
    // base case: it's a block
    if (currNode.children.length == 0) {
        return depth + "- " + store.getByEmbedding(currNode.embedding)?.text.trim() + "\n";

    // recursive case: it's a cluster
    } else {
        let clusterStr = depth + "- cluster\n";
        currNode.children.forEach((child) => {
            clusterStr += printTree(store, tree, child, depth + "\t");
        });
        return clusterStr;
    }
}