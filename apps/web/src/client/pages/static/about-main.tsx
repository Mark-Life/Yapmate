import { createRoot } from "react-dom/client";
import "../../styles/globals.css";
import { AboutPage } from "./about-page";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<AboutPage />);

if (import.meta.hot) {
  import.meta.hot.accept();
}
