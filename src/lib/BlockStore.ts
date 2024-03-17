import type { StorageAdapter } from "./storage/StorageAdapter";

export interface Block {
    text: string, 
    vec: number[], 
    timestamp: number,
    keywords: [string, number][]    // [keyword, term frequency]
}

export class BlockStore extends Map<number, Block> {
    private _adapter: StorageAdapter;
    private _embeddingKeys: Map<string, number>;

    constructor(adapter: StorageAdapter) {
        super();
        this._adapter = adapter;
        this._embeddingKeys = new Map<string, number>();
    }

    async init() {
        let contents = await this._adapter.readJson();
        if (contents.length > 0) {
            let savedBlockStore: Map<number, Block> = JSON.parse(contents, mapJsonReviver);
            for (let entry of savedBlockStore.entries()) {
                let [n, b] = entry;
                super.set(n, b as Block);
                this._embeddingKeys.set(JSON.stringify(b.vec.slice(0, 10)), n);
            }
        }
    }

    async setBlock(n: number, b: Block): Promise<this> {
        super.set(n, b);
        await this._adapter.writeJson(JSON.stringify(this, mapJsonReplacer));
        this._embeddingKeys.set(JSON.stringify(b.vec.slice(0, 10)), n);
        return this;
    }

    async deleteBlock(n: number): Promise<boolean> {
        let block = super.get(n);
        if (!block) return false;

        if (super.delete(n)) {
            await this._adapter.writeJson(JSON.stringify(this, mapJsonReplacer));
            for (let key in this._embeddingKeys.keys) {
                if (key == JSON.stringify(block.vec.slice(0, 10))) {
                    this._embeddingKeys.delete(key);
                    return true;
                }
            }
        }

        return false;
    }

    async clear(): Promise<void> {
        super.clear();
        await this._adapter.writeJson("");
        this._embeddingKeys.clear();
    }

    // Relies on first 10 floats of embedding as basis for hash. Not sure how robust this will be, 
    // relies on embedding model not changing. Seems to work for now.
    getByEmbedding(embedding: number[]): Block | undefined {
        let hash = this._embeddingKeys.get(JSON.stringify(embedding.slice(0, 10)));
        if (!hash) return undefined;
        return super.get(hash);
    }
}

// https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
export function hashCode(s: string): number {
    var hash = 0,
    i, chr;
    if (s.length === 0) return hash;
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function mapJsonReplacer(key: string, value: any) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: [...value],
        };
    } else {
        return value;
    }
}

function mapJsonReviver(key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}