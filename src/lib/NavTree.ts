import { invoke } from '@tauri-apps/api/tauri'

const BATCH_SIZE = 128;             //https://ai.stackexchange.com/questions/8560/how-do-i-choose-the-optimal-batch-size
const ROOT_CHILDREN_MAX = 7;        //https://www.crossrivertherapy.com/memory-capacity-of-human-brain
const DBSCAN_MIN_CLUSTER_PTS = 4;
const ROOT_NODE_SIM_THRESHOLD = 0.65;

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
        let prevInternalNodesMap = new Map<string, number>();
        while (embeddings.length > ROOT_CHILDREN_MAX) {

            // Cluster embeddings
            let [centroids, records, targets] = await kmeans_cluster(embeddings);

            // Reduce precision to 8 decimal places like in LocalEmbeddingAdapter
            centroids = centroids.map(val => Math.round(val * 100000000) / 100000000);
            records = records.map(val => Math.round(val * 100000000) / 100000000);

             // Create NavTree internal nodes for centroids
            let centroidsMatrix = arrayToMatrix(centroids, embeddings[0].length);
            let internalNodes : NavTreeNode[] = [];
            let internalNodesMap = new Map<string, number>();
            for (let i = 0; i < centroidsMatrix.length; i++) {
                if (!internalNodesMap.has(key(centroidsMatrix[i]))) {       // normal centroid
                    internalNodes.push({embedding: centroidsMatrix[i], children: []});
                    internalNodesMap.set(key(centroidsMatrix[i]), i);
                } else {                                                    // duplicate centroid
                    targets = targets.map((cluster) => {
                        if (cluster > i) return cluster - 1;
                        if (cluster == i) return internalNodesMap.get(key(centroidsMatrix[i])) || -1;
                        /* if (cluster < i) */ return cluster;
                    });
                    centroidsMatrix.splice(i, 1);
                    i--;
                }
            }

            // Assign children to internal nodes, use previous run's internal nodes 
            // as children if they exist
            for (let i = 0; records.length > 0; i++) {
                let embedding = records.splice(0, embeddings[0].length);
                let prevNodeIdx = prevInternalNodesMap.get(key(embedding));
                let child = prevNodeIdx ? prevInternalNodes[prevNodeIdx] : {embedding, children: []};

                // Child not a dbscan noise pt or existing internal node
                // (in the case of single point clusters)
                if (targets[i] > -1 && !internalNodesMap.has(key(embedding)))
                    internalNodes[targets[i]].children.push(child);
            }

            // Setup centroids to be clustered, and make them next round's children
            embeddings = centroidsMatrix;
            prevInternalNodes = internalNodes;
            prevInternalNodesMap = internalNodesMap;
        }

        this._root.children = prevInternalNodes;
    }

    // Search the tree for the most similar cluster to the given embedding, starting from
    // the cluster passed in as a parameter, and append a node to that cluster
    public insert(embedding: number[], currNode: NavTreeNode) {
        if (embedding.length == 0 || embedding.length == 1)         // Can't insert empty or dud
            return;
        if (currNode.children.length == 0 && currNode.embedding.length > 0)  // No blocks!
            return;

        let closest_node_idx = -1;
        let closest_sim = -1;
        let parent_sim = csim(embedding, currNode.embedding);
        if (parent_sim == 0) parent_sim = ROOT_NODE_SIM_THRESHOLD;

        for (let i = 0; i < currNode.children.length; i++) {
            if (currNode.children[i].children.length == 0) continue;    // skip blocks

            let sim = csim(embedding, currNode.children[i].embedding);
            if (sim > closest_sim) {
                closest_node_idx = i;
                closest_sim = sim;
            }
        }

        if (closest_sim > parent_sim) {
            this.insert(embedding, currNode.children[closest_node_idx]);
        } else {
            currNode.children.push({embedding, children: []})
        }
    }

    // Search the tree for the most similar node to the given embedding, starting from
    // the node passed in as a parameter
    public searchTree(embedding: number[], currNode: NavTreeNode): NavTreeNode {

        // Root node with no children: return a dud node that isn't a part of the tree
        if (currNode.children.length == 0 && currNode.embedding.length == 0)
            return {embedding: [-1], children: []}

        // Base case: reached block
        if (currNode.children.length == 0) 
            return currNode;

        let closest_node = currNode.children[0];
        let closest_sim = csim(embedding, closest_node.embedding);
        let parent_sim = csim(embedding, currNode.embedding);
        if (parent_sim == 0) parent_sim = ROOT_NODE_SIM_THRESHOLD;

        for (let i = 1; i < currNode.children.length; i++) {
            let sim = csim(embedding, currNode.children[i].embedding);;
            if (sim > closest_sim) {
                closest_node = currNode.children[i];
                closest_sim = sim;
            }
        }

        return closest_sim > parent_sim ? this.searchTree(embedding, closest_node) : currNode;
    }

    // Search the tree for the block node whose embedding is passed in starting from currNode.
    // Delete it if found.
    public delete(target: number[], currNode: NavTreeNode): boolean {
        if (currNode.children.length == 0 && currNode.embedding.length == 0)    // empty root
            return false;

        for (let i = 0; i < currNode.children.length; i++) {
            
            // Is block
            if (currNode.children[i].children.length == 0) {

                // Found node
                if (key(currNode.children[i].embedding) == key(target)) {
                    currNode.children.splice(i, 1);
                    return true;
                }
                continue;
            
            // Is cluster
            } else {
                let res = this.delete(target, currNode.children[i]);
                if (res && currNode.children[i].children.length == 0) {     // Delete empty cluster
                    currNode.children.splice(i, 1);
                    return res;
                }
            }
        }

        return false;
    }
}  

// Given two vectors, return the cosine similarity between them
export function csim(vec1: number[], vec2: number[]) {

    // Zip and sum helpers
    const zip = (vec1: number[], vec2: number[]) => vec1.map((k, i) => [k, vec2[i]]);
    const sum = (vec: number[]) => vec.reduce((acc, val) => acc + val, 0);
    
    // Get dot product and magnitudes
    let dot_product = zip(vec1, vec2).reduce((acc, tuple, i) => acc + (tuple[0] * tuple[1]), 0);
    let mag_vec1 = Math.sqrt(sum(vec1.map(k => k * k)));
    let mag_vec2 = Math.sqrt(sum(vec2.map(k => k * k)));

    // Return cosine theta
    if (mag_vec1 == 0 || mag_vec2 == 0) return 0;
    return dot_product / (mag_vec1 * mag_vec2);
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

// Take an array of NavTreeNodes and turn it into a key -> array index map 
function arrayToMap(nodes: NavTreeNode[]) {
    let m = new Map<string, number>();
    for (let i = 0; i < nodes.length; i++) {
        m.set(key(nodes[i].embedding), i);
    }
    return m;
}

// Takes embedding vector and turns it into a string key. As the key it 
// uses first 10 floats of embedding, that's good enough don't @ me bro
function key(embedding: number[]) {
    if (embedding.length < 10) {
        throw Error("Embedding too small!");
    }
    return JSON.stringify(embedding.slice(0, 10));
}