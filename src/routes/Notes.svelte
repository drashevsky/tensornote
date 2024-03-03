<script lang="ts">
    import { BlockStore } from "$lib/BlockStore";

    export let store : BlockStore;
</script>

<div class="w-full h-[75%] break-words overflow-scroll overflow-x-hidden p-3 border border-black">
    {#each store.entries() as block}
        <div class="border-b border-black p-5">
            <div>Text: {block[1].text}</div>
            <div>Vec: {block[1].vec.slice(0, 10)}</div>
        </div>
    {/each}
</div>