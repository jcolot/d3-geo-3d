# d3-geo-3d

<p align="center">
  <a href="https://d3js.org">
    <img src="https://github.com/d3/d3/raw/main/docs/public/logo.svg" width="180" height="180" alt="D3 Logo">
  </a>
</p>

<p align="center">
  <b>Experimental fork of <a href="https://github.com/d3/d3-geo">d3-geo</a> passing elevation parameter from geojson to the raw projection</b>
</p>
<p align="center">
  <em>Project and manipulate 3D geographic data: <code>[longitude, latitude, elevation]</code></em>
</p>

---

> ⚠️ <b>Status:</b> Work in progress — APIs may change. Not an official D3 package.

---

## Installation

```bash
npm install @jcolot/d3-geo-3d
# or
npm install d3-geo-3d
```

## Usage

```js
import { geoProjection } from "@jcolot/d3-geo-3d";

// Now supports elevation: [longitude, latitude, elevation]
```

---

## What’s Different from d3-geo?

- **Elevation parameter:** Coordinates are now `[λ, φ, h]` where `h` is height (in meters).
- **Compatibility:** Works with existing D3 workflows, but experimental.

---

## Resources

- [Original d3-geo Documentation](https://github.com/d3/d3-geo)
- [Original d3-geo Examples](https://observablehq.com/@d3/geo-projection)
- [This fork on GitHub](https://github.com/jcolot/d3-geo-3d)
- [Releases of d3-geo-3d](https://github.com/jcolot/d3-geo-3d/releases)

---

## Acknowledgments

This project is a fork of [d3-geo](https://github.com/d3/d3-geo) by Mike Bostock.  
All credit for the original design belongs to the D3 contributors.  
This fork is maintained by Julien Colot.