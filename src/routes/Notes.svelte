<script lang="ts">
    import { BlockStore } from "$lib/BlockStore";
    import { NavTree } from "$lib/NavTree";
    import NestedListNode from "./NestedListNode.svelte";

    export let store : BlockStore;
    export let tree : NavTree;

    async function updateNotes() {
		let embeddings: number[][] = Array.from(store.values()).map(block => block.vec);
        // let timestamp = Date.now();
        await tree.buildTree(embeddings);
        tree = tree;
        // console.log("Nested list updated in", Date.now() - timestamp, "ms");
	}

    $: store && updateNotes();
</script>

<div class="w-full h-[75%] break-words overflow-scroll overflow-x-hidden p-3 border border-black">
    <NestedListNode {store} currNode={tree.root}></NestedListNode>
</div>