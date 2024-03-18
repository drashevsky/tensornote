<script lang="ts">
    import type { BlockStore } from "$lib/BlockStore";
    import { getTfIdf, getTopNKeywords } from "$lib/Keywords";
    import { csim, type NavTreeNode } from "$lib/NavTree";
    import { createEventDispatcher } from 'svelte';
    import { slide } from "svelte/transition";

    const NUM_KEYWORDS = 5;
    const CURSOR_ACTIVE = "border-red-400 border-b-2";
    const SVG_ARROW = `M13.75 9.56879C14.0833 9.76124 14.0833 10.2424 13.75
                       10.4348L8.5 13.4659C8.16667 13.6584 7.75 13.4178 7.75
                       13.0329L7.75 6.97072C7.75 6.58582 8.16667 6.34525 8.5 6.5377L13.75 9.56879Z`;
    const UNTITLED_SUBLIST_NAME = "Untitled Sublist";

    export let store: BlockStore;
    export let currNode: NavTreeNode;
    export let cursorNode: NavTreeNode;
    export let descFunc: (node: NavTreeNode) => number[][];
    const dispatch = createEventDispatcher();

    let closed = false;
    let title = UNTITLED_SUBLIST_NAME;

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

    function getTitle(node: NavTreeNode): string {
        if (currNode.children.length == 0 || currNode.embedding.length == 0)
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

    $: title = getTitle(currNode);
</script>

<div class="w-full pt-1 {(cursorNode == currNode) ? CURSOR_ACTIVE : ""}">
    {#if currNode.children.length > 0 && currNode.embedding.length == 0}
        {#each [...currNode.children].sort(sortNodes) as child}
            <svelte:self {store} currNode={child} {cursorNode} {descFunc} on:removenode/>
        {/each}
    {:else if currNode.children.length > 0}
        <div class="w-full h-full flex items-start">
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions-->
            <svg viewBox="0 0 20 20" 
                 class="w-5 h-5 mt-1 shrink-0 fill-gray-300 hover:fill-slate-700 {closed || "rotate-90"}"
                 on:click={() => {closed = !closed}}>
                <path d="{SVG_ARROW}"></path>
            </svg>
            <svg viewBox="0 0 20 20" class="w-5 h-5 mt-1 mr-2 shrink-0 fill-slate-700">
                <circle cx="10" cy="10" r="3.5"></circle>
            </svg>
            <div class="h-full font-bold">{title}</div>
        </div>
        {#if !closed}
            <div class="w-full pl-10" transition:slide>
                {#each [...currNode.children].sort(sortNodes) as child}
                    <svelte:self {store} currNode={child} {cursorNode} {descFunc} on:removenode/>
                {/each}
            </div>
        {/if}
    {:else if currNode.embedding.length > 0}
        <div class="flex items-start">
            <svg viewBox="0 0 20 20" class="w-5 h-5 mt-1 mr-2 shrink-0 fill-slate-700">
                <circle cx="10" cy="10" r="3.5"></circle>
            </svg>
            <div id="{cursorNode == currNode ? "cursor" : ""}" 
                class="w-full h-full whitespace-pre-wrap hover:bg-gray-100 hover:rounded-md" 
                role="button" 
                tabindex="0" 
                on:keydown={handleKey}
                on:dblclick={handleDblClick}>  
                {store.getByEmbedding(currNode.embedding)?.text}
            </div>
        </div>
    {/if}
</div>