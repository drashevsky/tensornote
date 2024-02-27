<script lang="ts">
    import { onMount } from "svelte";
    import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";
    import { BlockStore, type Block } from "$lib/BlockStore";

    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';

    let adapter : LocalEmbeddingAdapter;
    let store : BlockStore = new BlockStore();
    let embedding : number[] = [];

    onMount(async () => {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create("Xenova/jina-embeddings-v2-small-en-8192");
        console.log(adapter.config.model_name + " ready.");
    });

    async function handleInputBar(event : CustomEvent) {
        embedding = (await adapter.embed(event.detail.text)).vec;
        if (event.detail.submit && !store.contains(event.detail.text)) {
            store.add({
                text: event.detail.text,
                vec: (await adapter.embed(event.detail.text)).vec,
                timestamp: Date.now()
            });
            store = store;
        }
    }
</script>

<NavBar />
<Notes {store}/>
<InputBar on:inputbarupdate={handleInputBar}/>
