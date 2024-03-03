<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { BlockStore, hashCode } from "$lib/BlockStore";

    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import InputBar from './InputBar.svelte';
    import { NavTree, type NavTreeNode } from "$lib/NavTree";

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

    async function printTreeHelper(texts: Map<string, string>, currNode: NavTreeNode, depth: string) {
        
        // base case: it's a block
        if (currNode.children.length == 0) {
            let query = JSON.stringify(currNode.embedding.slice(0, 10));
            console.log(depth, texts.get(query));

        // recursive case: it's a cluster
        } else {
            console.log(depth + "cluster");
            currNode.children.forEach((child) => {
                printTreeHelper(texts, child, depth + "----");
            });
        }
    }

    async function printTree(store: BlockStore) {
        let tree = new NavTree();
        let embeddings: number[][] = [];
        let texts = new Map<string, string>();
        Array.from(store.values()).forEach(block => {
            embeddings.push(block.vec);
            texts.set(JSON.stringify(block.vec.slice(0, 10)), block.text);
        });
        let timestamp = Date.now();
        await tree.buildTree(embeddings);
        printTreeHelper(texts, tree.root, "");
        console.log(Date.now() - timestamp, "ms");
    }
</script>

<NavBar />
<Notes {store}/>
<InputBar on:inputbarupdate={(event) => {
    adapter.postMessage({type: "embed", value: event.detail.text});
    inputEvents.push(event);
}}/>
