export class Rect {
  constructor(left, top, right, bottom) {
    this._l = left;
    this._r = right;
    this._t = top;
    this._b = bottom;
  }
  get left() {
    return this._l;
  }
  get top() {
    return this._t;
  }
  get right() {
    return this._r;
  }
  get bottom() {
    return this._b;
  }
  get x() {
    return this.left;
  }
  get y() {
    return this.top;
  }
  get cx() {
    return (this.left + this.right) / 2;
  }
  get cy() {
    return (this.top + this.bottom) / 2;
  }
  get width() {
    return this.right - this.left;
  }
  get height() {
    return this.bottom - this.top;
  }
  expanded(left, top = left, right = left, bottom = top) {
    return new Rect(
      this.left - left,
      this.top - top,
      this.right + right,
      this.bottom + bottom
    );
  }
}

export function flippedRect({ left, top, right, bottom }) {
  return new Rect(top, left, bottom, right);
}
