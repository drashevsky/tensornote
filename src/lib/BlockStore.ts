export interface Block {
    text : string,
    vec : number[],
    timestamp : number
}

export class BlockStore {
    public blocks : Block[];

    constructor(filepath? : string) {
        this.blocks = [];
    }
}