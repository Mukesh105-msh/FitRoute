// src/VirtualTryOn.jsx
// Virtual Try-On — Professional unavailable state.
// Requires external AI API (e.g. Fashn.ai, Replicate, Hugging Face VITON).

import { Shirt, ExternalLink, Sparkles } from "lucide-react";
import "./VirtualTryOn.css";

const PROVIDERS = [
  {
    name: "Fashn.ai",
    description: "AI-powered virtual try-on API for fashion e-commerce.",
    url: "https://fashn.ai",
    note: "Paid API — requires account and API key."
  },
  {
    name: "Replicate (VITON-HD)",
    description: "Open-source virtual try-on model hosted on Replicate.",
    url: "https://replicate.com/cuuupid/idm-vton",
    note: "Pay-per-prediction — requires Replicate token."
  },
  {
    name: "Hugging Face — IDM-VTON",
    description: "Free inference API for the IDM-VTON model (rate-limited).",
    url: "https://huggingface.co/yisol/IDM-VTON",
    note: "Hugging Face Inference Endpoint required for production."
  }
];

export default function VirtualTryOn() {
  return (
    <section className="vto-page">
      <div className="vto-heading">
        <div>
          <span className="vto-kicker">
            <Sparkles size={15} />
            AI FASHION TECHNOLOGY
          </span>
          <h1>Virtual <em>Try-On.</em></h1>
          <p>
            See any garment from your wardrobe on a model — before you wear it.
          </p>
        </div>
        <div className="vto-heading-icon">
          <Shirt size={34} />
        </div>
      </div>

      {/* COMING SOON STATE */}
      <div className="vto-unavailable-card">
        <div className="vto-icon-wrap">
          <Shirt size={40} />
        </div>

        <h2>Integration Required</h2>

        <p>
          Virtual try-on requires a third-party AI image-generation API.
          FitRoute does not ship with a try-on engine built in — this feature
          must be connected to one of the providers below before it can operate.
        </p>

        <div className="vto-steps">
          <h3>How to enable Virtual Try-On</h3>
          <ol>
            <li>Choose a provider below and create an account.</li>
            <li>Obtain your API key or access token.</li>
            <li>
              Add the key to <code>backend/.env</code> as{" "}
              <code>VIRTUAL_TRYON_API_KEY</code>.
            </li>
            <li>
              Implement the provider's SDK in{" "}
              <code>backend/routes/tryonRoutes.js</code>.
            </li>
            <li>
              Call <code>POST /api/tryon</code> with the garment image and
              model image.
            </li>
          </ol>
        </div>
      </div>

      {/* PROVIDER CARDS */}
      <div className="vto-providers-heading">
        <span className="vto-section-label">SUPPORTED PROVIDERS</span>
        <h2>Choose a try-on API</h2>
      </div>

      <div className="vto-providers">
        {PROVIDERS.map((provider) => (
          <div key={provider.name} className="vto-provider-card">
            <div className="vto-provider-top">
              <Sparkles size={20} className="vto-provider-icon" />
              <strong>{provider.name}</strong>
            </div>
            <p>{provider.description}</p>
            <span className="vto-provider-note">{provider.note}</span>
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="vto-provider-link"
            >
              View documentation
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>

      <p className="vto-disclaimer">
        Virtual Try-On is listed on the FitRoute roadmap. Functionality depends
        on a configured API integration. No garment images are processed or
        stored until the integration is active.
      </p>
    </section>
  );
}

