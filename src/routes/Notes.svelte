<script lang="ts">
    import { BlockStore } from "$lib/BlockStore";
    import { NavTree } from "$lib/NavTree";
    import NestedListNode from "./NestedListNode.svelte";

    export let store : BlockStore;
    export let tree : NavTree;

    let texts : Map<string, string> = new Map<string, string>();

    async function updateNotes() {
		let embeddings: number[][] = [];
        texts.clear();
        Array.from(store.values()).forEach(block => {
            embeddings.push(block.vec);
            texts.set(JSON.stringify(block.vec.slice(0, 10)), block.text);
        });
        // let timestamp = Date.now();
        await tree.buildTree(embeddings);
        tree = tree;
        // console.log("Nested list updated in", Date.now() - timestamp, "ms");
	}

    $: store && updateNotes();
</script>

<div class="w-full h-[75%] break-words overflow-scroll overflow-x-hidden p-3 border border-black">
    <NestedListNode {texts} currNode={tree.root}></NestedListNode>
</div>