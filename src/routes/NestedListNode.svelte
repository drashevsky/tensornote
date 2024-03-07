<script lang="ts">
    import type { BlockStore } from "$lib/BlockStore";
    import type { NavTreeNode } from "$lib/NavTree";

    export let store: BlockStore;
    export let currNode: NavTreeNode;

    function sortByTimestamp(a: NavTreeNode, b: NavTreeNode) {
        let e1 = store.getByEmbedding(a.embedding) , e2 = store.getByEmbedding(b.embedding);
        if (e1 && e2) return e1.timestamp - e2.timestamp;
        if (e1 || e2) return (e1) ? 1 : -1;
        return 0;
    }
</script>

<div class="w-full">
    {#if currNode.children.length > 0 && currNode.embedding.length == 0}
        {#each [...currNode.children].sort(sortByTimestamp) as child}
            <svelte:self {store} currNode={child}/>
        {/each}
    {:else if currNode.children.length > 0}
        <div class="w-full h-100">Cluster</div>
        <div class="w-full pt-1 pl-4">
            {#each [...currNode.children].sort(sortByTimestamp) as child}
                <svelte:self {store} currNode={child}/>
            {/each}
        </div>
    {:else if currNode.embedding.length > 0}
        <div class="w-full h-100 border-black border-b">  
            <p>{store.getByEmbedding(currNode.embedding)?.text}</p>
        </div>
    {/if}
</div>