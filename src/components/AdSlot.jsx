import { useEffect, useRef } from "react";

export function NativeAd() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");

    script.async = true;
    script.setAttribute(
      "data-cfasync",
      "false"
    );

    script.src =
      "https://pl29871532.profitableratecpmnetwork.com/60d1e1cbc5c4413a46aed86e91265d53/invoke.js";

    container.appendChild(script);

    const adContainer =
      document.createElement("div");

    adContainer.id =
      "container-60d1e1cbc5c4413a46aed86e91265d53";

    container.appendChild(adContainer);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      className="ad native-ad"
      ref={containerRef}
      aria-label="Advertisement"
    />
  );
}

export function BannerAd() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.innerHTML = "";

    window.atOptions = {
      key: "9c0c187f54d7f7fb22c3b4c329946669",
      format: "iframe",
      height: 50,
      width: 320,
      params: {}
    };

    const script = document.createElement("script");

    script.src =
      "https://www.highrevenueformat.com/9c0c187f54d7f7fb22c3b4c329946669/invoke.js";

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      className="ad banner-ad"
      ref={containerRef}
      aria-label="Advertisement"
    />
  );
}

export function SmartLink() {
  const url = import.meta.env.VITE_SMART_LINK;

  if (!url) {
    return null;
  }

  return (
    <a
      className="smart-link"
      href={url}
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      Sponsored link
    </a>
  );
}
