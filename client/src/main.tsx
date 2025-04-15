import { createRoot } from "react-dom/client";
import "./index.css";
// Important: Import Firebase configuration first to initialize Firebase before anything else
import "./lib/firebaseConfig";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
