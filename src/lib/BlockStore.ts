export interface Block {
    text : string,
    vec : number[],
    timestamp : number
}

interface BlockTable {
    [key : string]: Block,
}

export class BlockStore implements Iterable<Block> {
    private _blocktable : BlockTable;

    constructor(filepath? : string) {
        this._blocktable = {};
    }

    add(block : Block) {
        let hash = BlockStore.simpleHash(block.text);
        if (!this._blocktable[hash])
            this._blocktable[hash] = block;
    }

    remove(block : Block) {
        let hash = BlockStore.simpleHash(block.text);
        if (this._blocktable[hash])
            delete this._blocktable[hash];
    }

    contains(query : Block | string) {
        let hash = BlockStore.simpleHash((BlockStore.instanceOfBlock(query)) ? query.text : query);
        return this._blocktable[hash] ? true : false;
    }

    // Stupid wrapper to make for-each work and keep the BlockStore abstraction
    [Symbol.iterator]() {
        let iter = Object.entries(this._blocktable)[Symbol.iterator]();

        return {
            next: function (): IteratorResult<Block, undefined> {
                let block = iter.next();
                if (!block.done) {
                    return { value: block.value[1], done: false };
                } else {
                    return { value: undefined, done: true };
                }
            },
        };
    }

    private static simpleHash(str : string) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
        }
        // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
        return (hash >>> 0).toString(36).padStart(7, '0');
    }

    private static instanceOfBlock(x: any): x is Block {
        return typeof(x) == "object" && 'text' in x;
    }
}