<script lang="ts">
    import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";

    export let adapter : LocalEmbeddingAdapter; 
    let text : string = '';
    // let oldtext : string = '';
    let embedding : number[] = [];
    let debounce : NodeJS.Timeout = setTimeout(() => {}, 0); 

    async function updateEmbedding() {
        
        // Make sure embedding is updated every 125 ms
        clearTimeout(debounce);
        debounce = setTimeout((async (t : string) => {
            if (text == t) {
                embedding = (await adapter.embed(text)).vec;
            }
        }).bind(null, text), 125);

        // Trigger re-embed every 4 characters or every word
        // if (text.split(" ").length != oldtext.split(" ").length || 
        //    Math.abs(text.length - oldtext.length) >= 4) {
        //    oldtext = text;
        //    embedding = (await adapter.embed(text)).vec;
        // }
    }

    $: text && updateEmbedding();
</script>

<div class="fixed bottom-0 w-full h-[20%]">
    <textarea class="w-full h-full" placeholder="Type or search for a note." bind:value={text}/>
</div>