use linfa::Float;
use linfa_nn::distance::Distance;
use ndarray::{ArrayView, Dimension, Zip};

#[cfg(feature = "serde")]
use serde_crate::{Deserialize, Serialize};


// Cosine distance: https://en.wikipedia.org/wiki/Cosine_similarity#Cosine_distance
#[cfg_attr(
    feature = "serde",
    derive(Serialize, Deserialize),
    serde(crate = "serde_crate")
)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CosDist;
impl<F: Float> Distance<F> for CosDist {
    #[inline]
    fn distance<D: Dimension>(&self, a: ArrayView<F, D>, b: ArrayView<F, D>) -> F {
        let dot_product = Zip::from(&a).and(&b).fold(F::zero(), |acc, &a, &b| acc + (a * b));
        let norm_a = a.iter().map(|&a| a.powi(2)).sum::<F>().sqrt();
        let norm_b = b.iter().map(|&b| b.powi(2)).sum::<F>().sqrt();
        let cos_theta = if norm_a == F::zero() || norm_b == F::zero() { 
            F::zero() 
        } else { 
            dot_product / (norm_a * norm_b) 
        };
        F::one() - cos_theta   // Angular distance is computationally expensive but if needed look at:
                               // https://en.wikipedia.org/wiki/Cosine_similarity#Angular_distance_and_similarity
    }
}