export interface Block {
    text: string, 
    vec: number[], 
    timestamp: number
}

export class BlockStore extends Map<number, Block> {
    private _embeddingKeys: Map<string, number>;

    constructor() {
        super();
        this._embeddingKeys = new Map<string, number>();
    }

    set(n: number, b: Block): this {
        super.set(n, b);
        this._embeddingKeys.set(JSON.stringify(b.vec.slice(0, 10)), n);
        return this;
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