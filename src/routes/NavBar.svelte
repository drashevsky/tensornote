<script lang="ts">
    import img from "$lib/logo.png";
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();

    let exportBtn: HTMLElement;
    let clearBtn: HTMLElement;
    let closed = true;

    function handleClick(e: MouseEvent) {
        if (e.currentTarget == exportBtn) {
            dispatch('toclipboard');
        } else if (e.currentTarget == clearBtn) {
            dispatch('clear');
        }
    }
</script>

<div class="fixed top-2 right-6 flex flex-col items-end">
    <button class="w-6 h-6 " on:click={() => closed = !closed}>
        <svg viewBox="0 0 24 24" class="w-full h-full fill-slate-700">
            <path d="M4 18L20 18" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path> 
            <path d="M4 12L20 12" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path> 
            <path d="M4 6L20 6" stroke="#000000" stroke-width="1.5" stroke-linecap="round"></path> 
        </svg>        
    </button>
    {#if !closed}
        <div class="bg-stone-50 min-w-40 shadow-lg">
            <div class="px-4 py-3 flex items-center">
                <img src="{img}" class="w-5 h-5 mr-2" alt="TensorNote"/>
                <p>TensorNote</p>
            </div>
            <button class="w-full px-4 py-3 block text-left hover:bg-zinc-100" 
                    bind:this={exportBtn} 
                    on:click={handleClick}>
                Copy all to clipboard
            </button>
            <button class="w-full px-4 py-3 block text-left hover:bg-zinc-100" 
                    bind:this={clearBtn} 
                    on:click={handleClick}>
                Clear all
            </button>
        </div>
    {/if}
</div>