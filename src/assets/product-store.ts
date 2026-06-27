type ProductCategory = {
  id?: string;
  name?: string;
};

type ProductVersion = {
  description?: string;
  docUrl?: string;
  downloadUrl?: string;
  releaseBy?: string;
  releaseTime?: string;
  supportVersionRange?: string;
  version?: string;
};

type ListResult<T> = {
  items?: T[];
};

const productCategoryListEndpoint = "/apis/public.product.muyin.site/v1alpha1/product-category/list";
const productVersionListEndpoint = "/apis/public.product.muyin.site/v1alpha1/product-version-info-page/list";

export function appendProductRefcode(href: string, refcode: string, base = window.location.origin) {
  const cleanRefcode = refcode.trim();
  if (!href || !cleanRefcode) {
    return href;
  }

  try {
    const baseUrl = new URL(base);
    const target = new URL(href, baseUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return href;
    }
    if (!target.searchParams.has("refcode")) {
      target.searchParams.set("refcode", cleanRefcode);
    }
    if (target.origin === baseUrl.origin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
    return target.toString();
  } catch {
    return href;
  }
}

function authHeaders(token: string): HeadersInit {
  return token ? { "X-Api-Token": token } : {};
}

async function fetchProductJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: authHeaders(token) });
  if (!response.ok) {
    throw new Error(`Product request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function readCurrentRefcode() {
  return new URLSearchParams(window.location.search).get("refcode") || "";
}

function enhanceProductLinks(root: ParentNode) {
  const refcode = readCurrentRefcode();
  if (!refcode) {
    return;
  }

  root.querySelectorAll<HTMLAnchorElement>("a[data-hydro-product-link]").forEach((link) => {
    link.href = appendProductRefcode(link.getAttribute("href") || link.href, refcode);
  });
}

function appendOption(select: HTMLSelectElement, value: string, label: string, selectedValue: string) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = value === selectedValue;
  option.dataset.hydroProductCategoryOption = "true";
  select.append(option);
}

async function hydrateProductCategorySelect(select: HTMLSelectElement) {
  const token = select.dataset.apiToken || "";
  const selectedValue = select.dataset.currentCategoryId || select.value || "";

  try {
    const data = await fetchProductJson<ListResult<ProductCategory>>(
      `${productCategoryListEndpoint}?page=1&size=100`,
      token,
    );
    const items = Array.isArray(data.items) ? data.items : [];

    select.querySelectorAll("option[data-hydro-product-category-option]").forEach((option) => option.remove());
    items.forEach((category) => {
      if (!category.id) {
        return;
      }
      appendOption(select, category.id, category.name || category.id, selectedValue);
    });

    if (selectedValue && !items.some((category) => category.id === selectedValue)) {
      appendOption(select, selectedValue, selectedValue, selectedValue);
    }
  } catch {
    const hasSelectedOption = Array.from(select.options).some((option) => option.value === selectedValue);
    if (selectedValue && !hasSelectedOption) {
      appendOption(select, selectedValue, selectedValue, selectedValue);
    }
  }
}

function initProductCategorySelects(root: ParentNode) {
  root.querySelectorAll<HTMLSelectElement>("select[data-hydro-product-category-select]").forEach((select) => {
    void hydrateProductCategorySelect(select);
  });
}

function createVersionMeta(label: string, value: string) {
  const item = document.createElement("span");
  item.textContent = `${label}: ${value}`;
  return item;
}

function createVersionLink(label: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer noopener";
  link.textContent = label;
  return link;
}

function renderVersions(list: HTMLElement, versions: ProductVersion[]) {
  const cards = versions.map((version) => {
    const card = document.createElement("article");
    card.className = "hydro-product-version-card";

    const title = document.createElement("strong");
    title.textContent = version.version || "未命名版本";
    card.append(title);

    const meta = document.createElement("div");
    meta.className = "hydro-product-version-card__meta";
    if (version.supportVersionRange) {
      meta.append(createVersionMeta("支持", version.supportVersionRange));
    }
    if (version.releaseTime) {
      meta.append(createVersionMeta("发布", version.releaseTime));
    }
    if (version.releaseBy) {
      meta.append(createVersionMeta("发布者", version.releaseBy));
    }
    if (meta.childElementCount > 0) {
      card.append(meta);
    }

    if (version.description) {
      const description = document.createElement("p");
      description.textContent = version.description;
      card.append(description);
    }

    if (version.docUrl || version.downloadUrl) {
      const actions = document.createElement("div");
      actions.className = "hydro-product-version-card__actions";
      if (version.docUrl) {
        actions.append(createVersionLink("文档", version.docUrl));
      }
      if (version.downloadUrl) {
        actions.append(createVersionLink("下载", version.downloadUrl));
      }
      card.append(actions);
    }

    return card;
  });

  list.replaceChildren(...cards);
}

async function hydrateProductVersions(section: HTMLElement) {
  const productType = section.dataset.productType || "";
  const productKey = section.dataset.productKey || "";
  const token = section.dataset.apiToken || "";
  const status = section.querySelector<HTMLElement>("[data-hydro-product-versions-status]");
  const list = section.querySelector<HTMLElement>("[data-hydro-product-versions-list]");

  if (productType !== "LICENSE" || !productKey || !list) {
    return;
  }

  status?.removeAttribute("hidden");
  if (status) {
    status.textContent = "版本加载中";
  }

  try {
    const params = new URLSearchParams({ page: "1", productKey, size: "20" });
    const data = await fetchProductJson<ListResult<ProductVersion>>(`${productVersionListEndpoint}?${params}`, token);
    const versions = Array.isArray(data.items) ? data.items : [];

    if (versions.length === 0) {
      list.replaceChildren();
      if (status) {
        status.textContent = "暂无公开版本";
      }
      return;
    }

    renderVersions(list, versions);
    if (status) {
      status.hidden = true;
    }
  } catch {
    list.replaceChildren();
    if (status) {
      status.textContent = "版本暂时不可用";
    }
  }
}

function initProductVersions(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-hydro-product-versions]").forEach((section) => {
    void hydrateProductVersions(section);
  });
}

export function initProductStore(root: ParentNode = document) {
  enhanceProductLinks(root);
  initProductCategorySelects(root);
  initProductVersions(root);
}
