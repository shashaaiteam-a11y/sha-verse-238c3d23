import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { SwipeWrapper } from "@/components/SwipeWrapper";
import { lockSwipeNavigation } from "@/lib/swipeNavigationLock";

const touch = (type: "touchstart" | "touchend", x: number, y: number) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, type === "touchstart" ? "touches" : "changedTouches", {
    value: [{ clientX: x, clientY: y }],
  });
  return event;
};

const renderSwipeHarness = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;

  act(() => {
    root = createRoot(container);
    root.render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <SwipeWrapper>
                <div data-testid="route">home</div>
                <div
                  data-no-swipe-nav="true"
                  data-testid="reaction-category-scroll"
                  style={{ overflowX: "auto", width: "120px" }}
                >
                  <div style={{ width: "600px" }}>Smileys Love Gestures People Animals Food</div>
                </div>
              </SwipeWrapper>
            }
          />
          <Route path="/movion" element={<div data-testid="route">movion</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });

  return { container, root: root! };
};

afterEach(() => {
  document.body.innerHTML = "";
  delete document.body.dataset.swipeNavDisabled;
});

describe("reaction/category swipe lock", () => {
  it("does not switch modules when swiping horizontally inside the reaction category bar", () => {
    const { container, root } = renderSwipeHarness();
    const scroller = container.querySelector('[data-testid="reaction-category-scroll"]')!;

    act(() => {
      scroller.dispatchEvent(touch("touchstart", 320, 120));
      scroller.dispatchEvent(touch("touchend", 40, 124));
    });

    expect(container.querySelector('[data-testid="route"]')?.textContent).toBe("home");
    act(() => root.unmount());
  });

  it("does not switch modules while the global reaction sheet swipe lock is active", () => {
    const { container, root } = renderSwipeHarness();
    const unlock = lockSwipeNavigation();
    const wrapper = container.querySelector(".flex-1")!;

    act(() => {
      wrapper.dispatchEvent(touch("touchstart", 320, 120));
      wrapper.dispatchEvent(touch("touchend", 40, 124));
    });

    expect(container.querySelector('[data-testid="route"]')?.textContent).toBe("home");
    unlock();
    act(() => root.unmount());
  });

  it("still switches modules for a normal page-level horizontal swipe", () => {
    const { container, root } = renderSwipeHarness();
    const wrapper = container.querySelector(".flex-1")!;

    act(() => {
      wrapper.dispatchEvent(touch("touchstart", 320, 120));
      wrapper.dispatchEvent(touch("touchend", 40, 124));
    });

    expect(container.querySelector('[data-testid="route"]')?.textContent).toBe("movion");
    act(() => root.unmount());
  });
});