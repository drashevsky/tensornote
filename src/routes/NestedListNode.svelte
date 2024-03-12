<script lang="ts">
    import type { BlockStore } from "$lib/BlockStore";
    import { csim, type NavTreeNode } from "$lib/NavTree";
    import { createEventDispatcher } from 'svelte';

    const CURSOR_ACTIVE = "border-red-400 border-b-2";

    export let store: BlockStore;
    export let currNode: NavTreeNode;
    export let cursorNode: NavTreeNode;
    const dispatch = createEventDispatcher();

    // if both nodes are blocks, sort by timestamp. if both nodes are clusters, sort by distance
    // to parent. otherwise, put clusters first.
    function sortNodes(a: NavTreeNode, b: NavTreeNode) {
        let e1 = store.getByEmbedding(a.embedding);
        let e2 = store.getByEmbedding(b.embedding);
        let parent = currNode.embedding;

        if (e1 && e2) return e1.timestamp - e2.timestamp;                   // 2 blocks
        if (e1 || e2) return e1 ? 1 : -1;                                   // block/cluster
        if (parent.length == 0) return 0;                                   // root node item
        return (1 - csim(parent, a.embedding)) -                            // 2 clusters
               (1 - csim(parent, b.embedding));   
    }

    function handleKey(e: KeyboardEvent) {
        if (e.key == "Escape") {
            (e.target as HTMLElement).blur();
        } else if (e.key == "Enter") {
            dispatch('removenode', {node: currNode});
        }
    }

    function handleDblClick(e: MouseEvent) {
        dispatch('removenode', {node: currNode});
    }
</script>

<div class="w-full {(cursorNode == currNode) ? CURSOR_ACTIVE : ""}">
    {#if currNode.children.length > 0 && currNode.embedding.length == 0}
        {#each [...currNode.children].sort(sortNodes) as child}
            <svelte:self {store} currNode={child} {cursorNode} on:removenode/>
        {/each}
    {:else if currNode.children.length > 0}
        <div class="w-full h-100">Cluster</div>
        <div class="w-full pt-1 pl-4">
            {#each [...currNode.children].sort(sortNodes) as child}
                <svelte:self {store} currNode={child} {cursorNode} on:removenode/>
            {/each}
        </div>
    {:else if currNode.embedding.length > 0}
        <div id="{cursorNode == currNode ? "cursor" : ""}" 
             class="w-full h-100 border-black border-b whitespace-pre-wrap" 
             role="button" 
             tabindex="0" 
             on:keydown={handleKey}
             on:dblclick={handleDblClick}>  
            {store.getByEmbedding(currNode.embedding)?.text}
        </div>
    {/if}
</div>