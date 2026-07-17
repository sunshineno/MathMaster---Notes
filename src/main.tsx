import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/MathMaster---Notes/service-worker.js", { updateViaCache: "none" });
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => { if (!refreshing) { refreshing = true; window.location.reload(); } });
      const showUpdate = (worker: ServiceWorker) => {
        if (document.querySelector(".update-toast")) return;
        const toast=document.createElement("div"); toast.className="update-toast";
        const text=document.createElement("span"); text.textContent="Une nouvelle version de MathMaster Notes est prête.";
        const button=document.createElement("button"); button.type="button"; button.textContent="Actualiser"; button.onclick=()=>worker.postMessage({type:"SKIP_WAITING"});
        toast.append(text,button); document.body.appendChild(toast);
      };
      if (registration.waiting) showUpdate(registration.waiting);
      registration.addEventListener("updatefound",()=>{ const w=registration.installing; if(!w)return; w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)showUpdate(w)}); });
      window.setInterval(()=>registration.update(),60*60*1000);
    } catch (error) { console.warn("Service worker indisponible :", error); }
  });
}
