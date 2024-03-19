// Portions of this code taken from 
// - https://docs.rs/linfa-clustering/latest/linfa_clustering/struct.KMeans.html#tutorial
// - https://github.com/rust-ml/linfa/blob/master/algorithms/linfa-clustering/examples/kmeans.rs
// - https://github.com/rust-ml/linfa/blob/master/algorithms/linfa-clustering/examples/dbscan.rs
// under license: https://github.com/rust-ml/linfa/blob/master/LICENSE-MIT

use linfa::dataset::{DatasetBase, Labels};
use linfa::traits::{FitWith, Predict, Transformer};
use linfa_clustering::{KMeans, IncrKMeansError, Dbscan};
use linfa_nn::{KdTree, NearestNeighbour, distance::Distance};
use ndarray::{Array2, Axis};
use ndarray_rand::rand::SeedableRng;
use rand_xoshiro::Xoshiro256Plus;
use std::cmp::Ordering;
use js_sys::{Float32Array, BigInt64Array};
use wasm_bindgen::prelude::*;

mod distfns;
use distfns::CosDist;

// Take a vector containing a flattened matrix and cluster it using kmeans
pub fn kmeans_cluster(embeddings: Vec<f32>,
                      embeddings_cnt: usize,
                      embeddings_dims: usize,
                      batch_size: usize,
                      n_clusters: usize, ) -> (Vec<f32>, Vec<f32>, Vec<i64>) {
   
    let mut rng = Xoshiro256Plus::seed_from_u64(42);
    let data = Array2::from_shape_vec((embeddings_cnt, embeddings_dims), embeddings).unwrap();
    let dataset = DatasetBase::from(data.clone()).shuffle(&mut rng);                    // Imports the 2d embeddings matrix
    let clf = KMeans::params_with(n_clusters, rng.clone(), CosDist).tolerance(1e-3);    // Sets up kmeans

    // Repeatedly run fit_with on every batch in the dataset until we have converged.
    // fit_with implements the mini-batch-k-means algorithm
    let model = dataset
        .sample_chunks(batch_size)
        .cycle()
        .try_fold(None, |current, batch| {
            match clf.fit_with(current, &batch) {
                Ok(model) => Err(model),
                Err(IncrKMeansError::NotConverged(model)) => Ok(Some(model)),
                Err(err) => panic!("unexpected kmeans error: {}", err),
            }
        })
        .unwrap_err();

    // Extract centroids and cluster assignments
    let dataset = model.predict(dataset);
    let centroids = model.centroids().clone();
    let DatasetBase {
        records, targets, ..
    } = dataset;

    // Return flattened 2d matrices of centroids and original embeddings, arr of cluster assignments
    (centroids.into_raw_vec(), 
     records.into_raw_vec(), 
     targets.map(|&x| x as i64).into_raw_vec())
}

// Take a vector containing a flattened matrix and cluster it using dbscan
pub fn dbscan_cluster(embeddings: Vec<f32>,
                      embeddings_cnt: usize,
                      embeddings_dims: usize,
                      min_cluster_pts: usize) -> (Vec<f32>, Vec<f32>, Vec<i64>) {

    // Imports the 2d embeddings matrix
    let mut rng = Xoshiro256Plus::seed_from_u64(42);
    let data = Array2::from_shape_vec((embeddings_cnt, embeddings_dims), embeddings).unwrap();
    let dataset = DatasetBase::from(data.clone()).shuffle(&mut rng);

    // Run nearest neighbors to find a good epsilon value
    // https://towardsdatascience.com/machine-learning-clustering-dbscan-determine-the-optimal-value-for-epsilon-eps-python-example-3100091cfbc
    let nnindex = KdTree::new().from_batch(&data, CosDist).unwrap();
    let mut distances: Vec<f32> = Vec::new();
    for embedding in data.axis_iter(Axis(0)) {
        let nearest_pt = nnindex.k_nearest(embedding, 3).unwrap()[2].0; // using third nearest neighbor
        distances.push(CosDist.distance(embedding, nearest_pt));
    }

    // Sort the distances and use the distance at the steepest point of the array as the epsilon
    distances.sort_by(|a, b| a.partial_cmp(b).unwrap_or(Ordering::Equal));
    let (_max_diff, eps_index) = distances.windows(2)
                                          .enumerate()
                                          .map(|(i, window)| (window[1] - window[0], i))
                                          .max_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(Ordering::Equal))
                                          .unwrap();
    let epsilon = (distances[eps_index] + distances[eps_index + 1]) / 2.0;

    // Set up dbscan and run the model
    let cluster_memberships = Dbscan::params_with(min_cluster_pts, CosDist, KdTree)
        .tolerance(epsilon)
        .transform(dataset)
        .unwrap();
    
    // Generate centroids
    let label_count = cluster_memberships.label_count().remove(0);
    let modify = if label_count.contains_key(&None) { 1 }  else { 0 };
    let mut centroids: Vec<f32> = vec![0.0; (label_count.len() - modify) * embeddings_dims];
    let mut noise_pts: Vec<f32> = Vec::new();
    for label in label_count.into_keys() {
        match label {

            // Noise points have their own label, each will be added to centroids list individually
            None => {
                let embeddings_of_label = cluster_memberships.with_labels(&[None]);
                noise_pts.extend(embeddings_of_label.records.into_raw_vec());
            },

            // Get the labeled points of each cluster and take their mean to generate centroid
            Some(i) => {
                let embeddings_of_label = cluster_memberships.with_labels(&[Some(i)]);
                let mean_centroid = embeddings_of_label.records.mean_axis(Axis(0))
                                                       .unwrap()
                                                       .into_raw_vec();
                let start_slice = i * embeddings_dims;
                let end_slice = i * embeddings_dims + embeddings_dims;
                centroids[start_slice..end_slice].clone_from_slice(&mean_centroid);
            },
        }
    }
    centroids.extend(noise_pts);

    // Extract cluster assignments
    let DatasetBase {
        records, targets, ..
    } = cluster_memberships;

    // Return flattened 2d matrices of centroids and original embeddings, arr of cluster assignments
    (centroids, 
     records.into_raw_vec(), 
     targets.map(|&x| x.map(|c| c as i64).unwrap_or(-1)).into_raw_vec())
}

// Return struct representing result of clustering from wasm module to javascript
#[wasm_bindgen]
pub struct ClusterResult {
    centroids: Vec<f32>,
    embeddings: Vec<f32>,
    targets: Vec<i64>
}

#[wasm_bindgen]
impl ClusterResult {
    #[wasm_bindgen(getter)]
    pub fn centroids(&self) -> Float32Array {
        js_sys::Float32Array::from(&self.centroids[..])
    }

    #[wasm_bindgen(getter)]
    pub fn embeddings(&self) -> Float32Array {
        js_sys::Float32Array::from(&self.embeddings[..])
    }

    #[wasm_bindgen(getter)]
    pub fn targets(&self) -> BigInt64Array {
        js_sys::BigInt64Array::from(&self.targets[..])
    }
}

// Wasm binding for kmeans_cluster
#[wasm_bindgen]
pub fn kmeans_wasm(embeddings: Vec<f32>,
                   embeddings_cnt: usize,
                   embeddings_dims: usize,
                   batch_size: usize,
                   n_clusters: usize, ) -> ClusterResult {
    let (centroids, embeddings, targets) = 
        kmeans_cluster(embeddings, embeddings_cnt, embeddings_dims, batch_size, n_clusters);

    ClusterResult { centroids, embeddings, targets }
}

// Wasm binding for dbscan_cluster
#[wasm_bindgen]
pub fn dbscan_wasm(embeddings: Vec<f32>,
                   embeddings_cnt: usize,
                   embeddings_dims: usize,
                   min_cluster_pts: usize) -> ClusterResult {
    let (centroids, embeddings, targets) = 
        dbscan_cluster(embeddings, embeddings_cnt, embeddings_dims, min_cluster_pts);

    ClusterResult { centroids, embeddings, targets }
}