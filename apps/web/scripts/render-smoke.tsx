class FakeStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

(globalThis as Record<string, unknown>).localStorage = new FakeStorage();
(globalThis as Record<string, unknown>).localStorage.setItem("radar_token", "ssr-test-token");

import * as React from "react";
(globalThis as Record<string, unknown>).React = React;

import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "../src/App";

const routes = ["/", "/risks", "/controls", "/evidence", "/activity"];
for (const route of routes) {
  try {
    const html = renderToString(
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>,
    );
    console.log(`OK   ${route} (${html.length} chars)`);
  } catch (err) {
    console.error(`FAIL ${route}: ${(err as Error).message}`);
  }
}