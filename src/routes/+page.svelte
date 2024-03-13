<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BlockStore, hashCode } from "$lib/BlockStore";

    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';
    import { NavTree, type NavTreeNode } from "$lib/NavTree";

    const MODEL = "TaylorAI/bge-micro-v2";

    let adapter : Worker;
    let tokenLimit: number = 0;
    let store : BlockStore = new BlockStore();
    let tree : NavTree = new NavTree();
    let currEmbedding : number[] = [];
    let inputEvents : CustomEvent[] = [];
    let inputBarText: string = '';

    onMount(async () => {
        const w = await import('$lib/embeddings/EmbeddingAdapterWorker.ts?worker');
        adapter = new w.default();
        adapter.postMessage({type: "init", value: MODEL});
        adapter.addEventListener("message", handleAdapter);
        document.onkeydown = (e) => {
            if (document.activeElement == document.body && e.key == " ") {
                document.getElementById("input-bar")?.focus();
            }
        }
    });

    onDestroy(() => {
        adapter.terminate();
    });

    function handleAdapter(msg : MessageEvent) {
        if (msg.data.type == "init" && msg.data.value) {
            tokenLimit = msg.data.value;
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

    function removeNode(e: CustomEvent) {
        let block = store.getByEmbedding(e.detail.node.embedding);
        if (block) {
            tree.delete(e.detail.node.embedding, tree.root);
            tree = tree;
            store.delete(hashCode(block.text));
            store = store;
            inputBarText = block.text;
            document.getElementById("input-bar")?.focus();
        }
    }
</script>

<NavBar />
<Notes {store} {tree} {currEmbedding} on:removenode={removeNode}/>
<InputBar text={inputBarText} {tokenLimit} on:inputbarupdate={(event) => {
    adapter.postMessage({type: "embed", value: event.detail.text});
    inputEvents.push(event);
}}/>
