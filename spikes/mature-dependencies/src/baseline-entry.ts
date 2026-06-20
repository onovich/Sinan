export const matureDependencySpikeBaseline = {
  package: "sinan-mature-dependency-spikes",
  isolated: true
};

if (typeof window !== "undefined") {
  Object.assign(window, {
    matureDependencySpikeBaseline
  });
}
