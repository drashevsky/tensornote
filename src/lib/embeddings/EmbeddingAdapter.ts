/* Derived from Brian Petro's SmartEmbed library under MIT License on 2/25/2024
 * https://github.com/brianpetro/smart-embed/
 * https://github.com/brianpetro/smart-embed/blob/main/LICENSE
 */

import models from './models.json';

type embeddingModelType = "huggingface-transformers" | "openai";

interface embeddingModel {
    model_name : string,
    batch_size : number,
    dims : number,
    max_tokens : number,
    name : string,
    description : string,
    type : embeddingModelType
}

interface embeddingModels {
    [key : string] : embeddingModel
}

export interface embeddingModelOutput {
    embed_input : string,
    tokens : number,
    vec : number[],
    truncated : boolean,
    error : string,
}

export abstract class EmbeddingAdapter {

    model_config_key: string;
    config : embeddingModel;
    embed_ct : number;
    tokens : number; 

    constructor(model_config_key : string) {
        this.model_config_key = model_config_key;
        this.config = (models as embeddingModels)[this.model_config_key];
        this.embed_ct = 0;
        this.tokens = 0;
    }

    static create(model_config_key : string, ...args : any[]) : Promise<EmbeddingAdapter> {
        throw new Error("This EmbeddingAdapter method must be overridden.");
    }

    abstract init(): Promise<void>;

    abstract count_tokens(input : string): Promise<number>;

    abstract embed(input : string): Promise<embeddingModelOutput>;

    //abstract embed_batch(input : string[]): Promise<number[][]>;
    
    get batch_size() { return this.config.batch_size; }
    get dims() { return this.config.dims; }
    get max_tokens() { return this.config.max_tokens; }
    get model_name() { return this.config.model_name; }
}