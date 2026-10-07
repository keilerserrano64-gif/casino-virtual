// Calcula el RTP exacto del tragamonedas en WebAssembly.
// Compilar:  cd rust && wasm-pack build --target web
use wasm_bindgen::prelude::*;

const WEIGHTS: [(u32, f64); 6] = [(17, 4.0), (5, 6.0), (5, 10.0), (5, 15.0), (5, 30.0), (3, 100.0)];

#[wasm_bindgen]
pub fn rtp_exacto() -> f64 {
    let n: u32 = WEIGHTS.iter().map(|w| w.0).sum();
    let mut total = 0.0;
    for a in 0..6 { for b in 0..6 { for c in 0..6 {
        let p = (WEIGHTS[a].0 * WEIGHTS[b].0 * WEIGHTS[c].0) as f64;
        let m = if a == b && b == c { WEIGHTS[a].1 } else if a == b || b == c || a == c { 1.0 } else { 0.0 };
        total += p * m;
    }}}
    total / (n as f64).powi(3)
}
