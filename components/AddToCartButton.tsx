"use client";

import { useEffect, useId, useState } from "react";

declare global {
  interface Window {
    checkoutElements?: {
      init: (
        type: "overlayCheckout" | "inlineCheckout",
        options: {
          offer: string;
        }
      ) => {
        attach: (selector: string) => void;
      };
    };
  }
}

let hotmartScriptPromise: Promise<void> | null = null;

function loadHotmartCheckout(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Hotmart Checkout só pode ser carregado no navegador.")
    );
  }

  if (window.checkoutElements) {
    return Promise.resolve();
  }

  if (hotmartScriptPromise) {
    return hotmartScriptPromise;
  }

  hotmartScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.hotmart.com/lib/hotmart-checkout-elements.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(
          new Error("Não foi possível carregar o Checkout da Hotmart.")
        )
      );
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.hotmart.com/lib/hotmart-checkout-elements.js";

    script.async = true;

    script.onload = () => resolve();

    script.onerror = () => {
      hotmartScriptPromise = null;

      reject(
        new Error("Não foi possível carregar o Checkout da Hotmart.")
      );
    };

    document.head.appendChild(script);
  });

  return hotmartScriptPromise;
}

export function AddToCartButton({
  product,
}: {
  product: {
    hotmart_offer_code?: string | null;
  };
}) {
  const generatedId = useId();

  const buttonId = `hotmart-checkout-${generatedId.replace(/:/g, "")}`;

  const [ready, setReady] = useState(false);

  const offerCode = product.hotmart_offer_code?.trim();

  useEffect(() => {
    if (!offerCode) {
      return;
    }

    let cancelled = false;

    loadHotmartCheckout()
      .then(() => {
        if (cancelled || !window.checkoutElements) {
          return;
        }

        const elements = window.checkoutElements.init(
          "overlayCheckout",
          {
            offer: offerCode,
          }
        );

        elements.attach(`#${buttonId}`);

        setReady(true);
      })
      .catch((error) => {
        console.error("Erro ao carregar Checkout Hotmart:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [offerCode, buttonId]);

  if (!offerCode) {
    return (
      <button
        className="button"
        type="button"
        disabled
        title="Este produto ainda não está vinculado à Hotmart."
      >
        Comprar agora
      </button>
    );
  }

  return (
    <button
      id={buttonId}
      className="button"
      type="button"
      disabled={!ready}
    >
      {ready ? "Comprar agora" : "Carregando checkout..."}
    </button>
  );
}