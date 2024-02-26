<script lang="ts">
    import { onMount } from "svelte";
    import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";
    import InputBar from './InputBar.svelte';

    let adapter : LocalEmbeddingAdapter;

    onMount(async () => {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
        console.log(adapter.config.model_name + " ready.");
    });
</script>

<h1>Embeddings Test</h1>

<InputBar {adapter}/>
