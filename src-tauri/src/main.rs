// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use linfa::DatasetBase;
use linfa::traits::FitWith;
use linfa_clustering::{/*KMeansParams,*/ KMeans, IncrKMeansError};
use ndarray::Array2;
use ndarray_rand::rand::SeedableRng;
use rand_xoshiro::Xoshiro256Plus;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![cluster])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn cluster(embeddings: Vec<f32>,
           embeddings_cnt: usize,
           embeddings_dims: usize,
           batch_size: usize,
           n_clusters: usize, ) -> String {
   
    // Code taken from https://docs.rs/linfa-clustering/latest/linfa_clustering/struct.KMeans.html#tutorial
    let mut rng = Xoshiro256Plus::seed_from_u64(42);
    let data = Array2::from_shape_vec((embeddings_cnt, embeddings_dims), embeddings).unwrap();
    let observations = DatasetBase::from(data.clone()).shuffle(&mut rng);                       // Imports the 2d matrix
    let clf = KMeans::params_with_rng(n_clusters, rng.clone()).tolerance(1e-3);                 // Sets up kmeans

    // Repeatedly run fit_with on every batch in the dataset until we have converged.
    // fit_with implements the mini-batch-k-means algorithm
    let model = observations
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

    "centroids, assignments".to_string()
}