import {cartesian} from "../cartesian.js";  // still unit sphere, no R
import {abs, asin, atan2, cos, epsilon, radians, sqrt} from "../math.js";
import {transformer} from "../transform.js";

const maxDepth = 16;
const cosMinDistance = cos(30 * radians); // angular threshold

export default function(project, delta2) {
  return +delta2 ? resample(project, delta2) : resampleNone(project);
}

function resampleNone(project) {
  return transformer({
    point: function(lambda, phi, elevation = 0) {
      const p = project(lambda, phi, elevation);
      this.stream.point(p[0], p[1]);
    }
  });
}

function resample(project, delta2) {
  function resampleLineTo(
    x0, y0,
    lambda0, u0x, u0y, u0z, elevation0,
    x1, y1,
    lambda1, u1x, u1y, u1z, elevation1,
    depth, stream
  ) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d2 = dx * dx + dy * dy;

    if (d2 > 4 * delta2 && depth--) {
      // average directions
      let ax = u0x + u1x;
      let ay = u0y + u1y;
      let az = u0z + u1z;
      let m = sqrt(ax * ax + ay * ay + az * az);

      // Degeneracy guard for antipodal-ish inputs
      if (m < epsilon) {
        ax = u0x; ay = u0y; az = u0z;
        m = 1;
      }

      // normalized midpoint direction
      let ux = ax / m, uy = ay / m, uz = az / m;

      // spherical midpoint latitude
      const phi2 = asin(uz);

      // upstream-equivalent longitude choice
      const nearPole = abs(abs(uz) - 1) < epsilon;
      const closeLambda = abs(lambda0 - lambda1) < epsilon;
      const lambda2 = (nearPole || closeLambda) ? (lambda0 + lambda1) / 2 : atan2(uy, ux);

      // interpolate elevation
      const elevation2 = (elevation0 + elevation1) / 2;

      // project midpoint
      const p = project(lambda2, phi2, elevation2);
      const x2 = p[0], y2 = p[1];

      // angular test (dot of unit vectors)
      const dot = u0x * u1x + u0y * u1y + u0z * u1z;

      // perpendicular error (same as stock)
      const dx2 = x2 - x0, dy2 = y2 - y0;
      const dz = dy * dx2 - dx * dy2;

      if (
        (dz * dz / d2 > delta2) ||
        abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 ||
        dot < cosMinDistance
      ) {
        // recurse left
        resampleLineTo(
          x0, y0,
          lambda0, u0x, u0y, u0z, elevation0,
          x2, y2,
          lambda2, ux, uy, uz, elevation2,
          depth, stream
        );
        stream.point(x2, y2);
        // recurse right
        resampleLineTo(
          x2, y2,
          lambda2, ux, uy, uz, elevation2,
          x1, y1,
          lambda1, u1x, u1y, u1z, elevation1,
          depth, stream
        );
      }
    }
  }

  return function(stream) {
    let lambda00, x00, y00, u00x, u00y, u00z, elevation00;
    let lambda0, x0, y0, u0x, u0y, u0z, elevation0;

    const resampleStream = {
      point,
      lineStart,
      lineEnd,
      polygonStart: function() {
        stream.polygonStart();
        resampleStream.lineStart = ringStart;
      },
      polygonEnd: function() {
        stream.polygonEnd();
        resampleStream.lineStart = lineStart;
      }
    };

    function point(lambda, phi, elevation = 0) {
      const p = project(lambda, phi, elevation);
      stream.point(p[0], p[1]);
    }

    function lineStart() {
      x0 = NaN;
      resampleStream.point = linePoint;
      stream.lineStart();
    }

    function linePoint(lambda, phi, elevation = 0) {
      const u = cartesian([lambda, phi]); // [x,y,z] on unit sphere
      const p = project(lambda, phi, elevation);
      const x1 = p[0], y1 = p[1];

      if (isNaN(x0)) {
        // first point
        x0 = x1; y0 = y1;
        lambda0 = lambda;
        u0x = u[0]; u0y = u[1]; u0z = u[2];
        elevation0 = elevation;
        stream.point(x0, y0);
      } else {
        // subdivide previous -> current
        resampleLineTo(
          x0, y0,
          lambda0, u0x, u0y, u0z, elevation0,
          x1, y1,
          lambda, u[0], u[1], u[2], elevation,
          maxDepth, stream
        );
        stream.point(x1, y1);
        // shift window
        x0 = x1; y0 = y1;
        lambda0 = lambda;
        u0x = u[0]; u0y = u[1]; u0z = u[2];
        elevation0 = elevation;
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

    function ringPoint(lambda, phi, elevation = 0) {
      const u = cartesian([lambda, phi]);
      const p = project(lambda, phi, elevation);
      x0 = p[0]; y0 = p[1];
      lambda0 = lambda;
      u0x = u[0]; u0y = u[1]; u0z = u[2];
      elevation0 = elevation;

      // remember first ring point
      lambda00 = lambda;
      u00x = u0x; u00y = u0y; u00z = u0z;
      elevation00 = elevation0;
      x00 = x0; y00 = y0;

      stream.point(x0, y0);
      resampleStream.point = linePoint;
    }

    function ringEnd() {
      // close the ring exactly as upstream
      resampleLineTo(
        x0, y0,
        lambda0, u0x, u0y, u0z, elevation0,
        x00, y00,
        lambda00, u00x, u00y, u00z, elevation00,
        maxDepth, stream
      );
      resampleStream.lineEnd = lineEnd;
      lineEnd();
    }

    return resampleStream;
  };
}
