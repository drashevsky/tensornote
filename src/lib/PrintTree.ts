import { BlockStore } from "./BlockStore";
import { NavTree, type NavTreeNode } from "./NavTree";

async function printTreeHelper(texts: Map<string, string>, currNode: NavTreeNode, depth: string) {
        
    // base case: it's a block
    if (currNode.children.length == 0) {
        let query = JSON.stringify(currNode.embedding.slice(0, 10));
        console.log(depth, texts.get(query));

    // recursive case: it's a cluster
    } else {
        console.log(depth + "cluster");
        currNode.children.forEach((child) => {
            printTreeHelper(texts, child, depth + "----");
        });
    }
}

export async function printTree(store: BlockStore) {
    let tree = new NavTree();
    let embeddings: number[][] = [];
    let texts = new Map<string, string>();
    Array.from(store.values()).forEach(block => {
        embeddings.push(block.vec);
        texts.set(JSON.stringify(block.vec.slice(0, 10)), block.text);
    });
    let timestamp = Date.now();
    await tree.buildTree(embeddings);
    printTreeHelper(texts, tree.root, "");
    console.log(Date.now() - timestamp, "ms");
}