uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform float uStrength;
uniform vec2 uUvScale;

varying vec2 vUv;

void main() {
    vec2 scaledUv = fract(vUv * uUvScale);
    float blendAmount = clamp((scaledUv.x + scaledUv.y) * 0.5 * uStrength, 0.0, 1.0);
    vec3 finalColor = mix(uBaseColor, uAccentColor, blendAmount);

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
