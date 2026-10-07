// Fragment shader (WebGL / Three.js): brillo de neón dorado para la ruleta 3D.
precision mediump float;
uniform float uTiempo;
varying vec2 vUv;

void main() {
  float anillo = smoothstep(0.02, 0.0, abs(length(vUv - 0.5) - 0.4));
  float pulso = 0.6 + 0.4 * sin(uTiempo * 3.0);
  gl_FragColor = vec4(vec3(1.0, 0.8, 0.2) * anillo * pulso, anillo);
}
