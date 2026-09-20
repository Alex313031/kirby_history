// Dependency-free lightbox (Tobii, by @midzer) for the model grid + blog
// galleries. Any <a class="lightbox" href="full-image"> opens in the lightbox;
// captions come from the thumbnail's alt text. tobii.min.js loads first (defer
// preserves order), and this runs after the DOM is parsed, so the anchors exist.
// captionToggle:false keeps captions visible on mobile (<768px) instead of
// hiding them behind Tobii's default "i" toggle button.
new Tobii({ captionToggle: false });
