type HydroSearchWidgetElement = HTMLElement & {
  updateComplete?: Promise<unknown>;
};

const hydroSearchSkinElementNames = ["search-modal", "search-form"];
const hydroSearchSkinSelector = hydroSearchSkinElementNames.join(",");
const hydroSearchObservedRoots = new WeakSet<ShadowRoot>();
const hydroSearchUpdateQueued = new WeakSet<HydroSearchWidgetElement>();

function getHydroSearchShadowCss(localName: string) {
  switch (localName) {
    case "search-modal":
      return `
        :host {
          --halo-search-widget-base-font-family: "Space Mono", monospace;
          --halo-search-widget-base-font-size: 0.92rem;
          --halo-search-widget-base-rounded: 0.56rem;
          --halo-search-widget-primary-color: var(--hydro-coral);
          --halo-search-widget-color-result-item-bg: rgb(var(--hydro-ink-rgb) / 2.5%);
          --halo-search-widget-color-result-item-hover-bg: var(--hydro-search-selection-bg);
          display: contents !important;
        }

        .modal__wrapper {
          align-items: flex-start !important;
          padding: clamp(4.75rem, 12vh, 7rem) clamp(0.9rem, 3vw, 2rem) 2rem !important;
        }

        .modal__layer {
          background-color: rgb(var(--hydro-shadow-rgb) / 34%) !important;
          backdrop-filter: blur(10px) saturate(0.9) !important;
        }

        .modal__content {
          width: min(100%, 46rem) !important;
          max-height: min(78vh, 42rem) !important;
          overflow: hidden !important;
          border: 1px solid rgb(var(--hydro-ink-rgb) / 12%) !important;
          border-radius: 0.82rem !important;
          background:
            linear-gradient(180deg, rgb(var(--hydro-paper-rgb) / 96%), rgb(var(--hydro-paper-rgb) / 88%)),
            var(--hydro-bg) !important;
          box-shadow:
            0 1.4rem 4rem rgb(var(--hydro-shadow-rgb) / 16%),
            inset 0 1px 0 rgb(var(--hydro-paper-rgb) / 58%) !important;
          color: rgb(var(--hydro-ink-rgb) / 86%) !important;
        }

        @media (max-width: 640px) {
          .modal__wrapper {
            padding: calc(4.4rem + env(safe-area-inset-top)) 0.75rem 0.75rem !important;
          }

          .modal__content {
            width: 100% !important;
            max-height: calc(100dvh - 5.6rem - env(safe-area-inset-top)) !important;
            border-radius: 0.72rem !important;
          }
        }
      `;
    case "search-form":
      return `
        :host {
          --halo-search-widget-primary-color: var(--hydro-coral);
          --halo-search-widget-color-result-item-bg: rgb(var(--hydro-ink-rgb) / 2.5%);
          --halo-search-widget-color-result-item-hover-bg: var(--hydro-search-selection-bg);
          display: block !important;
          font-family: "Space Mono", monospace !important;
          color: rgb(var(--hydro-ink-rgb) / 86%) !important;
        }

        .sticky.top-0 {
          padding: 0.72rem !important;
          border-bottom: 1px solid rgb(var(--hydro-ink-rgb) / 10%) !important;
          background: rgb(var(--hydro-paper-rgb) / 92%) !important;
        }

        form {
          height: 3.15rem !important;
          border: 1px solid rgb(var(--hydro-ink-rgb) / 14%) !important;
          border-radius: 0.58rem !important;
          background: rgb(var(--hydro-ink-rgb) / 3%) !important;
          box-shadow: none !important;
        }

        form:focus-within {
          border-color: rgb(var(--hydro-ink-rgb) / 28%) !important;
          background: rgb(var(--hydro-paper-rgb) / 58%) !important;
          box-shadow: 0 0 0 2px rgb(var(--hydro-ink-rgb) / 4%) !important;
        }

        input {
          color: rgb(var(--hydro-ink-rgb) / 86%) !important;
          font-size: 0.9rem !important;
        }

        input::placeholder {
          color: rgb(var(--hydro-ink-rgb) / 42%) !important;
        }

        .p-3:not(.sticky) {
          padding: 0.72rem !important;
        }

        h3 {
          color: rgb(var(--hydro-ink-rgb) / 72%) !important;
          font-size: 0.74rem !important;
          letter-spacing: 0.02em !important;
        }

        ul[role="list"] {
          display: grid !important;
          gap: 0.42rem !important;
        }

        li[data-index] {
          position: relative !important;
          gap: 0.75rem !important;
          align-items: flex-start !important;
          padding: 0.78rem !important;
          border: 1px solid rgb(var(--hydro-ink-rgb) / 7%) !important;
          border-left: 2px solid transparent !important;
          border-radius: 0.52rem !important;
          background: rgb(var(--hydro-ink-rgb) / 2.5%) !important;
          box-shadow: none !important;
          color: rgb(var(--hydro-ink-rgb) / 84%) !important;
          transition:
            border-color 0.2s ease,
            background-color 0.2s ease,
            transform 0.2s ease !important;
        }

        li[data-index]:hover,
        li[data-index][class~="!bg-primary"] {
          border-color: rgb(var(--hydro-search-accent-rgb) / 34%) !important;
          border-left-color: var(--hydro-search-selection-border) !important;
          background:
            linear-gradient(90deg, rgb(var(--hydro-search-accent-rgb) / 12%), transparent 74%),
            rgb(var(--hydro-paper-rgb) / 52%) !important;
        }

        li[data-index]:active {
          transform: translateY(1px) !important;
        }

        li[data-index] > span:first-child {
          color: rgb(var(--hydro-ink-rgb) / 48%) !important;
        }

        li[data-index]:hover > span:first-child,
        li[data-index][class~="!bg-primary"] > span:first-child {
          color: rgb(var(--hydro-search-accent-rgb) / 86%) !important;
        }

        li[data-index] h2 {
          color: rgb(var(--hydro-ink-rgb) / 88%) !important;
          font-size: 0.88rem !important;
          line-height: 1.45 !important;
        }

        li[data-index] p {
          color: rgb(var(--hydro-ink-rgb) / 60%) !important;
          font-size: 0.76rem !important;
          line-height: 1.65 !important;
        }

        li[data-index]:hover h2,
        li[data-index][class~="!bg-primary"] h2 {
          color: rgb(var(--hydro-ink-rgb) / 94%) !important;
        }

        li[data-index]:hover p,
        li[data-index][class~="!bg-primary"] p {
          color: rgb(var(--hydro-ink-rgb) / 72%) !important;
        }

        li[data-index] > span:last-child {
          color: rgb(var(--hydro-search-accent-rgb) / 78%) !important;
        }

        mark {
          border-radius: 0.24rem !important;
          background: var(--hydro-search-highlight-bg) !important;
          box-shadow: 0 0 0 1px rgb(var(--hydro-search-accent-rgb) / 18%) inset !important;
          color: var(--hydro-search-highlight-text) !important;
          font-weight: 800 !important;
          padding: 0.02em 0.18em !important;
          text-decoration: none !important;
        }

        li[data-index]:hover mark,
        li[data-index][class~="!bg-primary"] mark {
          background: rgb(var(--hydro-search-accent-rgb) / 34%) !important;
          color: var(--hydro-search-highlight-text) !important;
          text-decoration: none !important;
        }

        .sticky.bottom-0 {
          justify-content: space-between !important;
          gap: 0.75rem !important;
          padding: 0.62rem 0.72rem !important;
          border-top: 1px solid rgb(var(--hydro-ink-rgb) / 10%) !important;
          background: rgb(var(--hydro-paper-rgb) / 92%) !important;
        }

        kbd {
          border-color: rgb(var(--hydro-ink-rgb) / 12%) !important;
          border-radius: 0.34rem !important;
          background: rgb(var(--hydro-ink-rgb) / 3%) !important;
          box-shadow: none !important;
          color: rgb(var(--hydro-ink-rgb) / 72%) !important;
        }

        .os-scrollbar {
          --os-size: 7px;
          --os-handle-bg: rgb(var(--hydro-ink-rgb) / 18%);
          --os-handle-bg-hover: rgb(var(--hydro-ink-rgb) / 28%);
          --os-handle-bg-active: rgb(var(--hydro-ink-rgb) / 34%);
        }

        @media (max-width: 640px) {
          input {
            font-size: 16px !important;
          }

          .sticky.bottom-0 {
            display: none !important;
          }

          li[data-index] {
            padding: 0.72rem !important;
          }
        }
      `;
    default:
      return "";
  }
}

function observeHydroSearchShadowRoot(element: HydroSearchWidgetElement) {
  const root = element.shadowRoot;
  if (!root || hydroSearchObservedRoots.has(root)) {
    return;
  }

  hydroSearchObservedRoots.add(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(scanHydroSearchNode);
    });
  });
  observer.observe(root, { childList: true, subtree: true });
}

function injectHydroSearchShadowStyle(element: HydroSearchWidgetElement) {
  const root = element.shadowRoot;
  if (!root) {
    return;
  }

  const css = getHydroSearchShadowCss(element.localName).trim();
  if (css && !root.querySelector("style[data-hydro-search-skin]")) {
    const style = document.createElement("style");
    style.dataset.hydroSearchSkin = "";
    style.textContent = css;
    root.append(style);
  }

  observeHydroSearchShadowRoot(element);
  scanHydroSearchTree(root);
}

function queueHydroSearchUpdate(element: HydroSearchWidgetElement) {
  const updateComplete = element.updateComplete;
  if (hydroSearchUpdateQueued.has(element) || !updateComplete || typeof updateComplete.then !== "function") {
    return;
  }

  hydroSearchUpdateQueued.add(element);
  updateComplete
    .then(() => {
      injectHydroSearchShadowStyle(element);
    })
    .catch(() => undefined);
}

function enhanceHydroSearchElement(element: Element) {
  const searchElement = element as HydroSearchWidgetElement;
  injectHydroSearchShadowStyle(searchElement);
  queueHydroSearchUpdate(searchElement);
}

function scanHydroSearchNode(node: Node) {
  if (!(node instanceof Element)) {
    return;
  }

  if (node.matches(hydroSearchSkinSelector)) {
    enhanceHydroSearchElement(node);
  }

  node.querySelectorAll(hydroSearchSkinSelector).forEach(enhanceHydroSearchElement);
}

function scanHydroSearchTree(root: ParentNode) {
  root.querySelectorAll(hydroSearchSkinSelector).forEach((element) => {
    enhanceHydroSearchElement(element);
    const shadowRoot = (element as HTMLElement).shadowRoot;
    if (shadowRoot) {
      scanHydroSearchTree(shadowRoot);
    }
  });
}

export function initSearchWidgetSkin() {
  if (!("customElements" in window)) {
    return;
  }

  scanHydroSearchTree(document);

  hydroSearchSkinElementNames.forEach((elementName) => {
    customElements
      .whenDefined(elementName)
      .then(() => {
        scanHydroSearchTree(document);
      })
      .catch(() => undefined);
  });

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(scanHydroSearchNode);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
