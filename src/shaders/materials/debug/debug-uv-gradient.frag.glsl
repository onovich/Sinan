uniform vec3 uBaseColor;
uniform vec3 uAccentColor;
uniform float uStrength;
uniform vec2 uUvScale;
uniform float uElapsedSeconds;
uniform vec2 uViewportSize;

varying vec2 vUv;

void main() {
    vec2 scaledUv = fract(vUv * uUvScale);
    float viewportAspect = clamp(uViewportSize.x / max(uViewportSize.y, 1.0), 0.5, 2.0);
    float timePulse = 0.925 + sin(uElapsedSeconds * 2.0) * 0.075;
    float globalStrength = clamp(uStrength * timePulse * viewportAspect, 0.0, 1.0);
    float blendAmount = clamp((scaledUv.x + scaledUv.y) * 0.5 * globalStrength, 0.0, 1.0);
    vec3 finalColor = mix(uBaseColor, uAccentColor, blendAmount);

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
