/* Derived from Brian Petro's SmartEmbed library under MIT License on 2/25/2024
 * https://github.com/brianpetro/smart-embed/
 * https://github.com/brianpetro/smart-embed/blob/main/LICENSE
 */

import { EmbeddingAdapter } from './EmbeddingAdapter';
import type { embeddingModelOutput } from './EmbeddingAdapter';
import { FeatureExtractionPipeline } from '@xenova/transformers';


export class LocalEmbeddingAdapter extends EmbeddingAdapter {
    model : any;
    tokenizer : any;

    static create(model_config_key : string, ...args : any[]) : Promise<LocalEmbeddingAdapter> {
        const adapter = new this(model_config_key);
        if (adapter.config.type != "huggingface-transformers") {
            throw new Error("Local embedding adapter cannot run model of type: " + adapter.config.type);
        }
        return adapter.init().then(() => {
            return adapter;
        });
    }

    async init() {
        const { env, pipeline, AutoTokenizer } = await import('@xenova/transformers');
        env.allowLocalModels = false;
        this.model = await pipeline('feature-extraction', this.model_name, { quantized: true /*, max_length: this.config.max_tokens */});
        this.tokenizer = await AutoTokenizer.from_pretrained(this.model_name);
    }
    
    async embed(input : string) : Promise<embeddingModelOutput> {
        const output : embeddingModelOutput = { embed_input: input, tokens: 0, vec: [], truncated: false, error: ""};
        if (!input) { output.error = "No input text."; return output }
        if (!this.model) await this.init();
    
        try {
            output.tokens = await this.count_tokens(input);
            if (output.tokens < 1) { output.error = "Input too short."; return output };
            if (output.tokens < this.config.max_tokens) {
                const embedding = await (this.model as FeatureExtractionPipeline)(input, { pooling: 'mean', normalize: true });
                output.vec = Array.from(embedding.data).map(val => Math.round(val * 100000000) / 100000000); // reduce precision to 8 decimal places ref: https://wfhbrian.com/vector-dimension-precision-effect-on-cosine-similarity/
            } else {
                const pct = this.config.max_tokens / output.tokens; // get pct of input to keep
                const max_chars = Math.floor(input.length * pct * 0.95); // get number of characters to keep (minus 5% for safety)
                input = input.substring(0, max_chars) + "...";
                output.truncated = true;
                console.log("Input too long. Truncating to ", input.length, " characters.");
                const { vec, tokens } = await this.embed(input);
                output.vec = vec;
                output.tokens = tokens;
            }
            return output;
        } catch (err) {
            console.log(err);
            output.error = "Something went wrong with embedding."; 
            return output;
        }
    }

    async count_tokens(text : string) {
        if (!this.tokenizer) await this.init();
        const { input_ids } = await this.tokenizer(text);
        return input_ids.data.length; // Return the number of tokens
    }
}