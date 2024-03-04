// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod clustering;
use clustering::{kmeans_cluster, dbscan_cluster};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![kmeans_cluster, dbscan_cluster])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}