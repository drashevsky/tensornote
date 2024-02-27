import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";

let adapter : LocalEmbeddingAdapter;

self.onmessage = async function(msg) {
    if (msg.data.type == "init") {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create(msg.data.value);
        self.postMessage({
            type: "init",
            value: true
        });
        console.log(adapter.config.model_name + " ready.");

    } else if (msg.data.type == "embed") {
        //console.log("Creating vec for: \"", msg.data.value.slice(0, 10), "\"");
        //let currtime = Date.now();
        
        let vec : number[] = (await adapter.embed(msg.data.value)).vec;
        
        //console.log("Vec created in ", Date.now() - currtime, " ms");
        
        self.postMessage({
            type: "embed",
            value: vec
        });
    }
}
