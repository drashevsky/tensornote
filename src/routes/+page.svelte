<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BlockStore, hashCode } from "$lib/BlockStore";

    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';
    import { NavTree, type NavTreeNode } from "$lib/NavTree";

    let adapter : Worker;
    let store : BlockStore = new BlockStore();
    let tree : NavTree = new NavTree();
    let currEmbedding : number[] = [];
    let inputEvents : CustomEvent[] = [];

    onMount(async () => {
        const w = await import('$lib/embeddings/EmbeddingAdapterWorker.ts?worker');
        adapter = new w.default();
        adapter.postMessage({type: "init", value: "TaylorAI/bge-micro-v2"});
        adapter.addEventListener("message", handleAdapter);
        document.onkeydown = (e: KeyboardEvent) => {
            if (document.activeElement == document.body && e.key == "Tab") {
                e.preventDefault();
                document.getElementById("cursor")?.focus();
            } 
        }
    });

    onDestroy(() => {
        adapter.terminate();
    });

    function handleAdapter(msg : MessageEvent) {
        if (msg.data.type == "init" && msg.data.value == true) {
            console.log("Confirmed worker creation.");

        } else if (msg.data.type == "embed") {
            currEmbedding = msg.data.value;

            let e = inputEvents.shift();
            if (e !== undefined && e.detail.submit && !store.has(hashCode(e.detail.text))) {
                store.set(hashCode(e.detail.text), {
                    text: e.detail.text,
                    vec: currEmbedding,
                    timestamp: Date.now()
                });
                store = store;  
            }
        }
    }
</script>

<NavBar />
<Notes {store} {tree} {currEmbedding}/>
<InputBar on:inputbarupdate={(event) => {
    adapter.postMessage({type: "embed", value: event.detail.text});
    inputEvents.push(event);
}}/>
