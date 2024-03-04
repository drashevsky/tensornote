<script lang="ts">
    import type { BlockStore } from "$lib/BlockStore";
    import type { NavTreeNode } from "$lib/NavTree";

    export let store: BlockStore;
    export let currNode: NavTreeNode;
</script>

<div class="w-full">
    {#if currNode.children.length > 0 && currNode.embedding.length == 0}
        {#each currNode.children as child}
            <svelte:self {store} currNode={child}/>
        {/each}
    {:else if currNode.children.length > 0}
        <div class="w-full h-100">Cluster</div>
        <div class="w-full pt-1 pl-4">
            {#each currNode.children as child}
                <svelte:self {store} currNode={child}/>
            {/each}
        </div>
    {:else if currNode.embedding.length > 0}
        <div class="w-full h-100 border-black border-b">  
            <p>{store.getByEmbedding(currNode.embedding)?.text}</p>
        </div>
    {/if}
</div>