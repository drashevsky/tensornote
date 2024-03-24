<script lang="ts">
    import { BlockStore, hashCode } from "$lib/BlockStore";
    import { getKeywords } from "$lib/Keywords";
    import { NavTree } from "$lib/NavTree";
    import { onDestroy, onMount } from "svelte";
    import InputBar from './InputBar.svelte';
    import NavBar from "./NavBar.svelte";
    import Notes from "./Notes.svelte";
    import { printTree } from "$lib/NavTreeHelpers";

    const MODEL = "Xenova/jina-embeddings-v2-small-en-2048";
    const STORE_JSON_FILE = "store-" + MODEL.replace("/", "-") + ".json";
    const STORE_WEBSTORE_KEY = "blockstore-" + MODEL.replace("/", "-");

    let loaded = false;
    let store : BlockStore;
    let tree : NavTree;
    let adapter : Worker;
    let tokenLimit: number = 0;
    let currEmbedding : number[] = [];
    let inputEvents : CustomEvent[] = [];
    let inputBarText: string = '';

    onMount(loadTensorNote);

    onDestroy(() => {
        adapter.terminate();
    });

    async function loadTensorNote() {
        
        // Setup blockstore
        let storageApi = '__TAURI__' in window ? 
            (await import("$lib/storage/TauriFsAdapter")).TauriFsAdapter : 
            (await import("$lib/storage/WebStorageAdapter")).WebStorageAdapter;
        let storageName = '__TAURI__' in window ?  STORE_JSON_FILE : STORE_WEBSTORE_KEY;
        let storageAdapter = await storageApi.create(storageName);
        store = new BlockStore(storageAdapter);
        await store.init();

        // Load either tauri or wasm api. Rollup-plugin-rust doesn't do ts bindings officially yet
        // See this tutorial: https://blog.logrocket.com/integrating-svelte-app-rust-webassembly/
        // Documentation for rust plugin: https://github.com/wasm-tool/rollup-plugin-rust/
        const clusterLib = '__TAURI__' in window ? 
            (await import("@tauri-apps/api/tauri")) :
            //@ts-ignore
            (await (await import("../../src-tauri/lib_clustering/Cargo.toml")).default());
        
        // Build tree for the first time
        tree = new NavTree(clusterLib);
        if (store.size > 0) {
            let embeddings: number[][] = Array.from(store.values()).map(block => block.vec);
            await tree.buildTree(embeddings);
            tree = tree;
        }

        // Setup embedding adapter
        const w = await import('$lib/embeddings/EmbeddingAdapterWorker.ts?worker');
        adapter = new w.default();
        adapter.postMessage({type: "init", value: MODEL});
        adapter.addEventListener("message", handleAdapter);

        // Add keyboard shortcut to input bar
        document.onkeydown = (e) => {
            if (document.activeElement == document.body && e.key == " ") {
                e.preventDefault();
                document.getElementById("input-bar")?.focus();
            }
        }
    }

    // Receives text -> embedding result from embedding adapter worker, updates current embedding,
    // adds new block w/ embedding to blockstore if user had pressed enter
    async function handleAdapter(msg : MessageEvent) {
        if (msg.data.type == "init" && msg.data.value) {
            loaded = true;
            tokenLimit = msg.data.value;
            console.log("Confirmed worker creation.");

        } else if (msg.data.type == "embed") {
            currEmbedding = msg.data.value;

            let e = inputEvents.shift();
            if (e !== undefined && e.detail.submit && !store.has(hashCode(e.detail.text))) {
                await store.setBlock(hashCode(e.detail.text), {
                    text: e.detail.text,
                    vec: currEmbedding,
                    timestamp: Date.now(),
                    keywords: getKeywords(e.detail.text)
                });
                store = store;  
            }
        }
    }

    async function removeNode(e: CustomEvent) {
        // potential bug: shouldn't be able to delete anything if there are unsaved shift events
        let block = store.getByEmbedding(e.detail.node.embedding);
        if (block) {
            tree.delete(e.detail.node.embedding, tree.root);
            tree = tree;
            await store.deleteBlock(hashCode(block.text));
            store = store;
            inputBarText = block.text;
            document.getElementById("input-bar")?.focus();
        }
    }

    async function exportToClipboard() {
        await navigator.clipboard.writeText(await printTree(store, tree, tree.root, "", ""));
    }

    async function clear() {
        await store.clear();
        let embeddings: number[][] = Array.from(store.values()).map(block => block.vec);
        await tree.buildTree(embeddings);
        store = store;
        tree = tree;
    }
</script>

{#if loaded}
    <NavBar on:toclipboard={exportToClipboard} on:clear={clear}/>
    <Notes {store} {tree} {currEmbedding} on:removenode={removeNode}/>
    <InputBar text={inputBarText} {tokenLimit} on:inputbarupdate={(event) => {
        adapter.postMessage({type: "embed", value: event.detail.text});
        inputEvents.push(event);
    }}/>
{:else}
    <p>Loading TensorNote...</p>
{/if}
