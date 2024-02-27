<script lang="ts">
    import { BlockStore, type Block } from "$lib/BlockStore";

    export let store : BlockStore;
</script>

<div class="w-full h-[75%] break-words overflow-scroll overflow-x-hidden p-3 border border-black">
    {#each store as block}
        <div class="border-b border-black p-5">
            <div>Text: {block.text}</div>
            <div>Vec: {block.vec.slice(0, 10)}</div>
        </div>
    {/each}
</div>