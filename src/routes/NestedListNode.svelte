<script lang="ts">
    import type { NavTreeNode } from "$lib/NavTree";

    export let texts: Map<string, string>
    export let currNode: NavTreeNode;
</script>

<div class="w-full">
    {#if currNode.children.length > 0 }
        <div class="w-full h-100">Cluster</div>
        <div class="w-full pt-1 pl-4">
            {#each currNode.children as child}
                <svelte:self texts={texts} currNode={child}/>
            {/each}
        </div>
    {:else if currNode.embedding.length > 0}
        {@const query = JSON.stringify(currNode.embedding.slice(0, 10))}
        <div class="w-full h-100">  
            <p>{texts.get(query)}</p>
        </div>
    {/if}
</div>