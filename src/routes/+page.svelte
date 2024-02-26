<script lang="ts">
    import { onMount } from "svelte";
    import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";
    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';

    let adapter : LocalEmbeddingAdapter;

    onMount(async () => {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
        console.log(adapter.config.model_name + " ready.");
    });
</script>

<NavBar />
<Notes />
<InputBar {adapter}/>
