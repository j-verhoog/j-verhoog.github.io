# Skeleton Tag

A browser-based “tag” game using real-time pose estimation (PoseNet).  
Red circles chase your nearest joint; “tag” them back by touching them with your body.

## How to Run

1. Host these files on any static server (e.g. GitHub Pages).  
2. Make sure your page is served over `https://` (required for webcam).  
3. Open `index.html` in a modern browser.  
4. Click **Start Game** and allow camera access.

## Dependencies

- TensorFlow.js v3.9.0  
- @tensorflow-models/posenet v2.2.1  
