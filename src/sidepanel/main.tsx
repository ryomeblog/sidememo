import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { seedIfNeeded } from "./lib/db/seed";
import "./styles/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

// 初回シードはサイドパネル起動時に一度だけ非同期実行する。
// (UI のレンダリングをブロックしない)
void seedIfNeeded().catch((error) => {
  console.error("Seed failed", error);
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
