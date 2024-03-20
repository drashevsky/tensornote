<script lang="ts">
    import type { embeddingModels } from "$lib/embeddings/EmbeddingAdapter";
    import models from '$lib/embeddings/models.json';
    import img from "$lib/logo.png";
    import { createEventDispatcher } from 'svelte';

    const dispatch = createEventDispatcher();
    const modelList = models as embeddingModels;

    export let currModel: string;

    let modelSelector: HTMLSelectElement;
    let exportBtn: HTMLElement;
    let clearBtn: HTMLElement;
    let closed = true;

    function handleModelChange() {
        dispatch('changemodel', {model: modelSelector.value});
    }

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
            <div class="w-full px-4 py-3 block text-left hover:bg-zinc-100">
                <p class="mb-2">Model</p>
                <select class="w-full" bind:this={modelSelector} on:change={handleModelChange}>
                    {#each Object.keys(models) as name}
                        {#if modelList[name].type == "huggingface-transformers"}
                            <option selected={name == currModel}>{name}</option>
                        {/if}
                    {/each}
                </select>
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
            <a class="w-full px-4 py-3 block text-blue-600 underline hover:bg-zinc-100" 
               href="https://www.github.com/drashevsky/tensornote" 
               target="_blank">
               GitHub
            </a>
        </div>
    {/if}
</div>