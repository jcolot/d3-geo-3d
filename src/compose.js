import { isNumber } from "./math.js";

export default function (a, b) {
  function compose(x, y, z) {
    if (isNumber(z)) {
    return (x = a(x, y, z)), b(x[0], x[1], x[2]);
    } else {
      return (x = a(x, y)), b(x[0], x[1]);
    }
  }

  if (a.invert && b.invert)
    compose.invert = function (x, y, z) {
      if (isNumber(z)) {
      return (x = b.invert(x, y, z)), x && a.invert(x[0], x[1], x[2]);
      } else {
        return (x = b.invert(x, y)), x && a.invert(x[0], x[1]);
      }
    };

  return compose;
}