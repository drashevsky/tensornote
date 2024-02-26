<script lang="ts">
    import { onMount } from "svelte";
    import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";
    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';

    let adapter : LocalEmbeddingAdapter;
    let embedding : number[] = [];

    onMount(async () => {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
        console.log(adapter.config.model_name + " ready.");
    });

    async function updateEmbedding(event : CustomEvent) {
        embedding = (await adapter.embed(event.detail.text)).vec;
    }
</script>

<NavBar />
<Notes {embedding}/>
<InputBar on:inputbarupdate={updateEmbedding}/>
