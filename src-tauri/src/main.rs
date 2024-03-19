// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lib_clustering::{kmeans_cluster as kmeans, dbscan_cluster as dbscan};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![kmeans_cluster, dbscan_cluster])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command(rename_all = "snake_case")]
fn kmeans_cluster(embeddings: Vec<f32>,
                  embeddings_cnt: usize,
                  embeddings_dims: usize,
                  batch_size: usize,
                  n_clusters: usize, ) -> (Vec<f32>, Vec<f32>, Vec<i64>) {
    kmeans(embeddings, embeddings_cnt, embeddings_dims, batch_size, n_clusters)
}

#[tauri::command(rename_all = "snake_case")]
fn dbscan_cluster(embeddings: Vec<f32>,
                  embeddings_cnt: usize,
                  embeddings_dims: usize,
                  min_cluster_pts: usize) -> (Vec<f32>, Vec<f32>, Vec<i64>) {
    dbscan(embeddings, embeddings_cnt, embeddings_dims, min_cluster_pts)
}