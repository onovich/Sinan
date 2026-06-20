uniform float uProgress;
uniform float uEdgeWidth;
uniform vec3 uEdgeColor;
uniform vec3 uBaseColor;
uniform float uNoiseScale;

varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 value) {
    return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 value) {
    vec2 cell = floor(value);
    vec2 local = fract(value);
    vec2 curve = local * local * (3.0 - 2.0 * local);

    float bottomLeft = hash(cell);
    float bottomRight = hash(cell + vec2(1.0, 0.0));
    float topLeft = hash(cell + vec2(0.0, 1.0));
    float topRight = hash(cell + vec2(1.0, 1.0));
    float bottom = mix(bottomLeft, bottomRight, curve.x);
    float top = mix(topLeft, topRight, curve.x);

    return mix(bottom, top, curve.y);
}

void main() {
    float clampedProgress = clamp(uProgress, 0.0, 1.0);
    float clampedEdgeWidth = clamp(uEdgeWidth, 0.0, 0.35);
    vec2 noiseUv = vUv * max(uNoiseScale, 0.001) + vWorldPosition.xz * 0.17;
    float dissolveMask = valueNoise(noiseUv);

    if (dissolveMask < clampedProgress) {
        discard;
    }

    float edgeDistance = abs(dissolveMask - clampedProgress);
    float edgeAmount = 1.0 - smoothstep(0.0, max(clampedEdgeWidth, 0.0001), edgeDistance);
    vec3 finalColor = mix(uBaseColor, uEdgeColor, edgeAmount);

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
