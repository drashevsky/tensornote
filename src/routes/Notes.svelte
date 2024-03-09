<script lang="ts">
    import { BlockStore } from "$lib/BlockStore";
    import { NavTree, type NavTreeNode } from "$lib/NavTree";
    import NestedListNode from "./NestedListNode.svelte";

    const INSERT_THRESH = 5;

    export let store : BlockStore;
    export let tree : NavTree;
    export let currEmbedding: number[];

    let cursorNode : NavTreeNode;
    let insertCount = 0;

    async function updateNotes() {
        if (currEmbedding.length == 0 || currEmbedding.length == 1 || store.size == 0)
            return;

        if (insertCount < INSERT_THRESH) {
            tree.insert(currEmbedding, tree.root);
            tree = tree;
            insertCount += 1;
        } else {
            let embeddings: number[][] = Array.from(store.values()).map(block => block.vec);
            await tree.buildTree(embeddings);
            tree = tree;
            insertCount = 0;
        }
	}

    $: store && updateNotes();
    $: cursorNode = tree.searchTree(currEmbedding, tree.root);
</script>

<div class="w-full h-[75%] break-words overflow-scroll overflow-x-hidden p-3 border border-black">
    <NestedListNode {store} currNode={tree.root} {cursorNode}/>
</div>