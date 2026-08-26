import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollTo(arg?: ScrollToOptions | number, y?: number) {
      if (typeof arg === "number") {
        this.scrollLeft = arg;
        this.scrollTop = y ?? 0;
        return;
      }
      if (arg && typeof arg === "object") {
        if (typeof arg.left === "number") this.scrollLeft = arg.left;
        if (typeof arg.top === "number") this.scrollTop = arg.top;
      }
    };
  }
  if (!Element.prototype.scrollBy) {
    Element.prototype.scrollBy = function scrollBy(arg?: ScrollToOptions | number, y?: number) {
      if (typeof arg === "number") {
        this.scrollLeft += arg;
        this.scrollTop += y ?? 0;
        return;
      }
      if (arg && typeof arg === "object") {
        if (typeof arg.left === "number") this.scrollLeft += arg.left;
        if (typeof arg.top === "number") this.scrollTop += arg.top;
      }
    };
  }
}
