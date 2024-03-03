<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BlockStore, hashCode } from "$lib/BlockStore";

    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';

    let adapter : Worker;
    let store : BlockStore = new BlockStore();
    let embedding : number[] = [];
    let inputEvents : CustomEvent[] = [];

    onMount(async () => {
        const w = await import('$lib/embeddings/EmbeddingAdapterWorker.ts?worker');
        adapter = new w.default();
        adapter.postMessage({type: "init", value: "TaylorAI/bge-micro-v2"});
        adapter.addEventListener("message", handleAdapter);
    });

    onDestroy(() => {
        adapter.terminate();
    });

    function handleAdapter(msg : MessageEvent) {
        if (msg.data.type == "init" && msg.data.value == true) {
            console.log("Confirmed worker creation.");

        } else if (msg.data.type == "embed") {
            embedding = msg.data.value;

            let e = inputEvents.shift();
            if (e !== undefined && e.detail.submit && !store.has(hashCode(e.detail.text))) {
                store.set(hashCode(e.detail.text), {
                    text: e.detail.text,
                    vec: embedding,
                    timestamp: Date.now()
                });
                store = store;  
            }
        }
    }
</script>

<NavBar />
<Notes {store}/>
<InputBar on:inputbarupdate={(event) => {
    adapter.postMessage({type: "embed", value: event.detail.text});
    inputEvents.push(event);
}}/>
