// Portions of this code taken from 
// - https://docs.rs/linfa-clustering/latest/linfa_clustering/struct.KMeans.html#tutorial
// - https://github.com/rust-ml/linfa/blob/master/algorithms/linfa-clustering/examples/kmeans.rs
// under license: https://github.com/rust-ml/linfa/blob/master/LICENSE-MIT

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use linfa::DatasetBase;
use linfa::traits::FitWith;
use linfa::traits::Predict;
use linfa_clustering::{KMeans, IncrKMeansError};
use ndarray::Array2;
use ndarray_rand::rand::SeedableRng;
use rand_xoshiro::Xoshiro256Plus;

mod cosdist;
use cosdist::CosDist;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![cluster])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command(rename_all = "snake_case")]
fn cluster(embeddings: Vec<f32>,
           embeddings_cnt: usize,
           embeddings_dims: usize,
           batch_size: usize,
           n_clusters: usize, ) -> (Vec<f32>, Vec<f32>, Vec<u64>) {
   
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

    let dataset = model.predict(dataset);
    let centroids = model.centroids().clone();
    let DatasetBase {
        records, targets, ..
    } = dataset;

    // Return 2d matrices of centroids, original embeddings, cluster assignments
    (centroids.into_raw_vec(), 
     records.into_raw_vec(), 
     targets.map(|&x| x as u64).into_raw_vec())
}