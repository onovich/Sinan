uniform float uIntensity;
uniform vec3 uBaseColor;
uniform vec3 uScanlineColor;
uniform float uScanlineDensity;
uniform float uFlickerStrength;
uniform float uElapsedSeconds;
uniform vec2 uViewportSize;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vViewNormal;

void main() {
    float safeDensity = max(uScanlineDensity, 1.0);
    float scanWave = sin((vUv.y * safeDensity + uElapsedSeconds * 3.0) * 6.2831853);
    float scanline = smoothstep(0.72, 1.0, scanWave * 0.5 + 0.5);
    float fresnel = pow(1.0 - clamp(abs(vViewNormal.z), 0.0, 1.0), 2.0);
    float flicker = 1.0 - clamp(uFlickerStrength, 0.0, 0.5) *
        (0.5 + 0.5 * sin(uElapsedSeconds * 17.0 + vWorldPosition.x * 3.1));
    float viewportAspect = clamp(uViewportSize.x / max(uViewportSize.y, 1.0), 0.5, 2.0);
    float intensity = clamp(uIntensity, 0.0, 1.0);

    vec3 color = mix(uBaseColor, uScanlineColor, scanline * intensity);
    float alpha = clamp(
        (0.32 + scanline * 0.46 + fresnel * 0.22) * intensity * flicker * (0.9 + viewportAspect * 0.05),
        0.04,
        1.0
    );

    gl_FragColor = vec4(color * (0.85 + scanline * 0.25), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
