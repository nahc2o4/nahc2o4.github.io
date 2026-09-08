# SVG sprite trial

Five hand-rebuilt vector assets based on the existing Wiki references. Original WEBP files remain intact. Manifest `vector.src` selects the SVG; `vector.bbox` only overrides the transparent crop when the original is a card image. Thumbnail size metadata, world draw sizes and collision values are unchanged.

Animation-ready groups:
- Basic / Rose: `body`, with `outline` and `surface`.
- Wing: `wing`, pivot `69 189` in the 290×290 viewBox.
- Ladybug: `head`, `body`, `spots` (clipped to the shell).
- Bee: `stinger`, `body`, `stripes`, `antennae`; `antenna-left` / `antenna-right` paths.

The game currently decodes each SVG once and caches it for canvas drawing, just like the original sprites. Groups are editable vector source; they are not independently animated in the current canvas renderer. Future animation can transform these groups while generating cached frames, or use a dedicated layered canvas renderer. No SMIL/CSS animation is embedded.
