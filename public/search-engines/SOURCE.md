# Search engine icons

The Google, Yandex, and Bing SVG paths come from CoreUI Brands 2.0.1:

- Collection: https://github.com/coreui/coreui-icons
- Distribution: https://icon-sets.iconify.design/cib/
- License: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)

The source `currentColor` fill was replaced with each search engine's brand
color, and intrinsic width and height attributes were removed. These three
icons retain the collection's original `0 0 32 32` view box. The Yandex
wordmark was reduced to its initial from the same source path and optically
centered. The Google mark keeps the CoreUI outline and uses clipped brand-color
regions. The Bing outline has a blue-to-teal gradient.

The full-color DuckDuckGo Dax mark is from the official
[DuckDuckGo press kit](https://duckduckgo.com/press) and retains its `0 0 128 128`
view box. Its intrinsic width and height were removed; the paths and colors
were not changed. DuckDuckGo's name and logo remain its trademarks.

The four glass badges are drawn in `entrypoints/newtab/style.css`, around these
local SVG marks. Image generation was used to explore their shared lighting and
depth; the shipped design uses CSS and vector assets so the small icons remain
crisp. The marks have no remote loading dependency.
