import { LocalEmbeddingAdapter } from "$lib/embeddings/LocalEmbeddingAdapter";

// Can replace with different adapter if needed
let adapter : LocalEmbeddingAdapter;

self.onmessage = async function(msg) {

    // Params: type: "init", value: model name from models.json
    // Returns: type: "init", value: token limit
    if (msg.data.type == "init") {
        console.log("Initializing embeddings model...");
        adapter = await LocalEmbeddingAdapter.create(msg.data.value);
        self.postMessage({
            type: "init",
            value: adapter.max_tokens
        });
        console.log(adapter.config.model_name + " ready.");

    // Params: type: "embed", value: text string
    // Returns: type: "embed", value: embedding vector
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
