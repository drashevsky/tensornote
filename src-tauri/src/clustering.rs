// Portions of this code taken from 
// - https://docs.rs/linfa-clustering/latest/linfa_clustering/struct.KMeans.html#tutorial
// - https://github.com/rust-ml/linfa/blob/master/algorithms/linfa-clustering/examples/kmeans.rs
// - https://github.com/rust-ml/linfa/blob/master/algorithms/linfa-clustering/examples/dbscan.rs
// under license: https://github.com/rust-ml/linfa/blob/master/LICENSE-MIT

use linfa::dataset::{DatasetBase, Labels};
use linfa::traits::{FitWith, Predict, Transformer};
use linfa_clustering::{KMeans, IncrKMeansError, Dbscan};
use linfa_nn::CommonNearestNeighbour::KdTree;
use ndarray::{Array2, Axis};
use ndarray_rand::rand::SeedableRng;
use rand_xoshiro::Xoshiro256Plus;

mod distfns;
use distfns::CosDist;

// Take a vector containing a flattened matrix and cluster it using kmeans
#[tauri::command(rename_all = "snake_case")]
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
#[tauri::command(rename_all = "snake_case")]
pub fn dbscan_cluster(embeddings: Vec<f32>,
                  embeddings_cnt: usize,
                  embeddings_dims: usize,
                  min_cluster_pts: usize) -> (Vec<f32>, Vec<f32>, Vec<i64>) {

    // Imports the 2d embeddings matrix
    let mut rng = Xoshiro256Plus::seed_from_u64(42);
    let data = Array2::from_shape_vec((embeddings_cnt, embeddings_dims), embeddings).unwrap();
    let dataset = DatasetBase::from(data.clone()).shuffle(&mut rng);

    // Set up dbscan and run the model
    let cluster_memberships = Dbscan::params_with(min_cluster_pts, CosDist, KdTree)
        .tolerance(1e-3)
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