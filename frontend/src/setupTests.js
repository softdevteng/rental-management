// Test environment polyfills for jsdom
// Ensure window.matchMedia exists to avoid runtime errors during tests
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = function(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function() {}, // legacy
      removeListener: function() {}, // legacy
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    };
  };
}

// Optional: expose a helper to simulate viewport changes in tests
window.__setMatchMediaMatches = function(value) {
  if (typeof window.matchMedia !== 'function') return;
  // Replace matchMedia with one that returns the provided value
  window.matchMedia = function(query) {
    return {
      matches: !!value,
      media: query,
      onchange: null,
      addListener: function() {},
      removeListener: function() {},
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    };
  };
};
