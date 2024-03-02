import { invoke } from '@tauri-apps/api/tauri'
import { BlockStore } from './BlockStore';

let BATCH_SIZE = 128;

export async function cluster(store: BlockStore) {
    let embeddings = Array.from(store.keys());
    let embeddings_cnt = embeddings.length;
    let embeddings_dims = embeddings[0].length;
    console.log(await invoke('cluster', { 
        embeddings: embeddings.flat(), 
        embeddings_cnt, 
        embeddings_dims,
        batch_size: (embeddings_cnt < BATCH_SIZE) ? embeddings_cnt : BATCH_SIZE,
        n_clusters: Math.ceil(Math.sqrt(embeddings_cnt / 2))
    }));
}