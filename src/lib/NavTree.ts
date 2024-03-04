import { invoke } from '@tauri-apps/api/tauri'

let BATCH_SIZE = 128;           //https://ai.stackexchange.com/questions/8560/how-do-i-choose-the-optimal-batch-size
let ROOT_CHILDREN_MAX = 7;      //https://www.crossrivertherapy.com/memory-capacity-of-human-brain
let DBSCAN_MIN_CLUSTER_PTS = 4;

export interface NavTreeNode {
    embedding: number[],
    children: NavTreeNode[]
}

export class NavTree {
    private _root: NavTreeNode;

    constructor(embeddings?: number[][]) {
        this._root = {embedding: [], children: []}
        if (embeddings) {
            this.buildTree(embeddings);
        }
    }

    public get root() {
        return this._root;
    }

    // Take list of embeddings, cluster them, and rebuild the navigation tree
    public async buildTree(embeddings: number[][]) {

        // Known bug: cannot handle edge case, cluster of 1 block

        // Cannot cluster 0 elements
        if (embeddings.length == 0) {
            return;

        // Less than or equal to ROOT_CHILDREN_MAX, no need to cluster
        } else if (embeddings.length <= ROOT_CHILDREN_MAX) {
            this._root.children = [];
            embeddings.forEach((embedding) => {
                this._root.children.push({embedding, children: []})
            });
            return;
        }

        // In a loop, cluster this round of embeddings and then prepare the clusters to be assigned
        // as child nodes of the next round's clusters
 
        let prevInternalNodes : NavTreeNode[] = [];
        while (embeddings.length > ROOT_CHILDREN_MAX) {

            // Cluster embeddings
            let [centroids, records, targets] = await kmeans_cluster(embeddings);

            // Reduce precision to 8 decimal places like in LocalEmbeddingAdapter
            centroids = centroids.map(val => Math.round(val * 100000000) / 100000000);
            records = records.map(val => Math.round(val * 100000000) / 100000000);

             // Create NavTree internal nodes for centroids
            let centroidsMatrix = arrayToMatrix(centroids, embeddings[0].length);
            let internalNodes : NavTreeNode[] = [];
            for (let i = 0; i < centroidsMatrix.length; i++) {
                internalNodes.push({embedding: centroidsMatrix[i], children: []});
            }

            // Make a temp map of prevInternalNodes if they exist
            let prevInternalNodesMap = new Map<string, NavTreeNode>();
            prevInternalNodes.forEach((node) => {
                // Using first 10 floats as a key, that's good enough don't @ me bro
                prevInternalNodesMap.set(JSON.stringify(node.embedding.slice(0, 10)), node)
            });

            // Assign children to internal nodes, use previous run's internal nodes 
            // as children if they exist
            for (let i = 0; records.length > 0; i++) {
                let embedding = records.splice(0, embeddings[0].length);
                let child = prevInternalNodesMap.get(JSON.stringify(embedding.slice(0, 10))) || 
                            {embedding, children: []};
                if (targets[i] > -1) internalNodes[targets[i]].children.push(child);
            }

            // Setup centroids to be clustered, and make them next round's children
            embeddings = centroidsMatrix;
            prevInternalNodes = internalNodes;
        }

        this._root.children = prevInternalNodes;
    }
}  

// Given a list of embeddings, returns flattened 2d matrices of centroids and original 
// embeddings, as well as an array of cluster assignments using kmeans
async function kmeans_cluster(embeddings: number[][]): Promise<[number[], number[], number[]]> {
    let embeddings_cnt = embeddings.length;
    let embeddings_dims = embeddings[0].length;
    return await invoke('kmeans_cluster', { 
        embeddings: embeddings.flat(), 
        embeddings_cnt, 
        embeddings_dims,
        batch_size: (embeddings_cnt < BATCH_SIZE) ? embeddings_cnt : BATCH_SIZE,
        n_clusters: Math.ceil(Math.sqrt(embeddings_cnt / 2))
    });
}

// Given a list of embeddings, returns flattened 2d matrices of centroids + noise points 
// and original embeddings, as well as an array of cluster assignments using dbscan
async function dbscan_cluster(embeddings: number[][]): Promise<[number[], number[], number[]]> {
    let embeddings_cnt = embeddings.length;
    let embeddings_dims = embeddings[0].length;
    return await invoke('dbscan_cluster', { 
        embeddings: embeddings.flat(), 
        embeddings_cnt, 
        embeddings_dims,
        min_cluster_pts: DBSCAN_MIN_CLUSTER_PTS
    });
}

// Take a flattened matrix and turn it into a 2d matrix
function arrayToMatrix(arr: number[], row_length: number) {
    let matrix : number[][] = [];
    while (arr.length > 0)
        matrix.push(arr.splice(0, row_length));
    return matrix;
}