<script lang="ts">
    import type { BlockStore } from "$lib/BlockStore";
    import { csim, type NavTreeNode } from "$lib/NavTree";

    const CURSOR_ACTIVE = "border-red-400 border-b-2";
    const ROOT_NODE_THRESHOLD = 0.65;

    export let store: BlockStore;
    export let currNode: NavTreeNode;
    export let currEmbedding: number[];

    let cursor_node: NavTreeNode;
    let cursor_style: String = "";

    // pass the cursor to the child that is closest to current query, 
    // stay on current node if closest child similarity < parent similarity
    function updateCursor() {
        if (currEmbedding.length == 0) {
            cursor_node = currNode;
            cursor_style = "";
            return;
        }
        if (currNode.children.length == 0) {
            cursor_node = currNode;
            cursor_style = CURSOR_ACTIVE;
            return;
        }

        let closest_node = currNode.children[0];
        let closest_sim = csim(currEmbedding, closest_node.embedding);
        let parent_sim = csim(currEmbedding, currNode.embedding);
        if (parent_sim == 0) parent_sim = ROOT_NODE_THRESHOLD;

        for (let i = 1; i < currNode.children.length; i++) {
            let sim = csim(currEmbedding, currNode.children[i].embedding);;
            if (sim > closest_sim) {
                closest_node = currNode.children[i];
                closest_sim = sim;
            }
        }
        cursor_node = closest_sim > parent_sim ? closest_node : currNode;
        cursor_style = closest_sim > parent_sim ? "" : CURSOR_ACTIVE;
    }

    $: currEmbedding && updateCursor();

    // if both nodes are blocks, sort by timestamp. if both nodes are clusters, sort by distance
    // to parent. otherwise, put clusters first.
    function sortNodes(a: NavTreeNode, b: NavTreeNode) {
        let e1 = store.getByEmbedding(a.embedding);
        let e2 = store.getByEmbedding(b.embedding);
        let parent = currNode.embedding;

        if (e1 && e2) return e1.timestamp - e2.timestamp;                   // 2 blocks
        if (e1 || e2) return e1 ? 1 : -1;                                   // block/cluster
        if (parent.length == 0) return 0;                                   // root node item
        return (1 - csim(parent, a.embedding)) -                            // 2 clusters
               (1 - csim(parent, b.embedding));   
    }
</script>

<div class="w-full {cursor_style}">
    {#if currNode.children.length > 0 && currNode.embedding.length == 0}
        {#each [...currNode.children].sort(sortNodes) as child}
            <svelte:self {store} 
                         currNode={child} 
                         currEmbedding={(child == cursor_node) ? currEmbedding : []}/>
        {/each}
    {:else if currNode.children.length > 0}
        <div class="w-full h-100">Cluster</div>
        <div class="w-full pt-1 pl-4">
            {#each [...currNode.children].sort(sortNodes) as child}
            <svelte:self {store} 
                         currNode={child} 
                         currEmbedding={(child == cursor_node) ? currEmbedding : []}/>
            {/each}
        </div>
    {:else if currNode.embedding.length > 0}
        <div class="w-full h-100 border-black border-b">  
            <p>{store.getByEmbedding(currNode.embedding)?.text}</p>
        </div>
    {/if}
</div>