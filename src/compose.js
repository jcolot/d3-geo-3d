export default function (a, b) {
  function compose(x, y, z) {
    return (x = a(x, y, z)), b(x[0], x[1], x[2]);
  }

  if (a.invert && b.invert)
    compose.invert = function (x, y, z) {
      return (x = b.invert(x, y, z)), x && a.invert(x[0], x[1], x[2]);
    };

  return compose;
}