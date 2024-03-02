import { invoke } from '@tauri-apps/api/tauri'
import { BlockStore } from './BlockStore';

let BATCH_SIZE = 128;           //https://ai.stackexchange.com/questions/8560/how-do-i-choose-the-optimal-batch-size
let ROOT_CHILDREN_MAX = 7;      //https://www.crossrivertherapy.com/memory-capacity-of-human-brain

interface NavTreeNode {
    embedding: number[],
    children: NavTreeNode[]
}

export class NavTree {
    root: NavTreeNode;

    constructor() {
        this.root = {embedding: [], children: []}
    }

    async cluster(embeddings: number[][]) {
        let embeddings_cnt = embeddings.length;
        let embeddings_dims = embeddings[0].length;
        return await invoke('cluster', { 
            embeddings: embeddings.flat(), 
            embeddings_cnt, 
            embeddings_dims,
            batch_size: (embeddings_cnt < BATCH_SIZE) ? embeddings_cnt : BATCH_SIZE,
            n_clusters: Math.ceil(Math.sqrt(embeddings_cnt / 2))
        });
    }
}  