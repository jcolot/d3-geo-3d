import {cartesian} from "../cartesian.js";  // <-- still unit sphere, no R
import {abs, asin, atan2, cos, radians, sqrt} from "../math.js";
import {transformer} from "../transform.js";

const maxDepth = 16;
const cosMinDistance = cos(30 * radians); // angular threshold

export default function(project, delta2) {
  return +delta2 ? resample(project, delta2) : resampleNone(project);
}

function resampleNone(project) {
  return transformer({
    point: function(lambda, phi, h = 0) {
      const p = project(lambda, phi, h);
      this.stream.point(p[0], p[1]);
    }
  });
}

function resample(project, delta2) {
  function resampleLineTo(x0, y0,
                          lambda0, u0x, u0y, u0z, h0,
                          x1, y1,
                          lambda1, u1x, u1y, u1z, h1,
                          depth, stream) {
    const dx = x1 - x0,
          dy = y1 - y0,
          d2 = dx * dx + dy * dy;

    if (d2 > 4 * delta2 && depth--) {
      // midpoint on the unit sphere (average directions, then normalize)
      const mx = u0x + u1x,
            my = u0y + u1y,
            mz = u0z + u1z;
      const mNorm = sqrt(mx * mx + my * my + mz * mz);
      const ux = mx / mNorm,
            uy = my / mNorm,
            uz = mz / mNorm;

      // spherical coords
      const phi2 = asin(uz);
      const lambda2 = atan2(uy, ux);

      // interpolate elevation
      const h2 = (h0 + h1) / 2;

      // project
      const p = project(lambda2, phi2, h2);
      const x2 = p[0], y2 = p[1];

      // angular test (dot product of unit vectors)
      const dot = u0x * u1x + u0y * u1y + u0z * u1z;

      if (
        ((dy * (x2 - x0) - dx * (y2 - y0)) ** 2 / d2 > delta2) || // perpendicular error
        abs((dx * (x2 - x0) + dy * (y2 - y0)) / d2 - 0.5) > 0.3 || // midpoint too close
        dot < cosMinDistance                                          // angular distance
      ) {
        // recurse left
        resampleLineTo(x0, y0,
                       lambda0, u0x, u0y, u0z, h0,
                       x2, y2,
                       lambda2, ux, uy, uz, h2,
                       depth, stream);
        stream.point(x2, y2);
        // recurse right
        resampleLineTo(x2, y2,
                       lambda2, ux, uy, uz, h2,
                       x1, y1,
                       lambda1, u1x, u1y, u1z, h1,
                       depth, stream);
      }
    }
  }

  return function(stream) {
    let lambda00, x00, y00, u00x, u00y, u00z, h00;
    let lambda0, x0, y0, u0x, u0y, u0z, h0;

    const resampleStream = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.polygonStart();
        resampleStream.lineStart = ringStart;
      },
      polygonEnd: function() {
        stream.polygonEnd();
        resampleStream.lineStart = lineStart;
      }
    };

    function point(lambda, phi, h = 0) {
      const p = project(lambda, phi, h);
      stream.point(p[0], p[1]);
    }

    function lineStart() {
      x0 = NaN;
      resampleStream.point = linePoint;
      stream.lineStart();
    }

    function linePoint(lambda, phi, h = 0) {
      
      const u = cartesian([lambda, phi]);   // unit vector
      const p = project(lambda, phi, h);
      const x1 = p[0], y1 = p[1];

      if (isNaN(x0)) {
        // first point
        x0 = x1; y0 = y1;
        lambda0 = lambda;
        u0x = u[0]; u0y = u[1]; u0z = u[2];
        h0 = h;
        stream.point(x0, y0);
      } else {
        // subsequent point: subdivide
        resampleLineTo(x0, y0,
                       lambda0, u0x, u0y, u0z, h0,
                       x1, y1,
                       lambda, u[0], u[1], u[2], h,
                       maxDepth, stream);
        stream.point(x1, y1);
        // update previous
        x0 = x1; y0 = y1;
        lambda0 = lambda;
        u0x = u[0]; u0y = u[1]; u0z = u[2];
        h0 = h;
      }
    }

    function lineEnd() {
      resampleStream.point = point;
      stream.lineEnd();
    }

    function ringStart() {
      lineStart();
      resampleStream.point = ringPoint;
      resampleStream.lineEnd = ringEnd;
    }

    function ringPoint(lambda, phi, h = 0) {
      const u = cartesian([lambda, phi]);
      const p = project(lambda, phi, h);
      x0 = p[0]; y0 = p[1];
      lambda0 = lambda;
      u0x = u[0]; u0y = u[1]; u0z = u[2];
      h0 = h;

      // save first ring point
      lambda00 = lambda;
      u00x = u0x; u00y = u0y; u00z = u0z;
      h00 = h0;
      x00 = x0; y00 = y0;

      stream.point(x0, y0);
      resampleStream.point = linePoint;
    }

    function ringEnd() {
      // close the ring
      resampleLineTo(x0, y0,
                     lambda0, u0x, u0y, u0z, h0,
                     x00, y00,
                     lambda00, u00x, u00y, u00z, h00,
                     maxDepth, stream);
      resampleStream.lineEnd = lineEnd;
      lineEnd();
    }

    return resampleStream;
  };
}
