<script lang="ts">
    import { BlockStore } from "$lib/BlockStore";
    import { NavTree, type NavTreeNode } from "$lib/NavTree";
    import { tick } from "svelte";
    import NestedListNode from "./NestedListNode.svelte";

    const INSERT_THRESH = 5;

    export let store : BlockStore;
    export let tree : NavTree;
    export let currEmbedding: number[];

    let old_store_size = 0;
    let insertCount = 0;
    let cursorNode : NavTreeNode;
    let notes_el: HTMLElement;

    async function updateNotes() {
        if (currEmbedding.length == 0 || currEmbedding.length == 1)
            return;
        if (store.size > old_store_size) {
            if (insertCount < INSERT_THRESH) {
                tree.insert(currEmbedding, tree.root);
                insertCount += 1;
            } else {
                let embeddings: number[][] = Array.from(store.values()).map(block => block.vec);
                await tree.buildTree(embeddings);
                insertCount = 0;
            }
            tree = tree;
        }
        old_store_size = store.size;
	}

    async function updateCursor() {
        cursorNode = tree.searchTree(currEmbedding, tree.root);
        await tick();

        let el = document.getElementById("cursor");
        let el_box = el?.getBoundingClientRect();
        let notes_box = notes_el?.getBoundingClientRect();
        if (el_box && notes_box && (el_box.top < notes_box.top || el_box.bottom > notes_box.bottom))
            document.getElementById("cursor")?.scrollIntoView({block: "center"});
    }

    $: store && updateNotes();
    $: currEmbedding && updateCursor();
</script>

<div class="w-full h-[85%] break-words overflow-scroll overflow-x-hidden p-3"
     bind:this={notes_el}>
    <NestedListNode {store} 
                    currNode={tree.root}
                    title="" 
                    {cursorNode} 
                    descFunc={node => tree.getDescendants(node)} on:removenode/>
</div>