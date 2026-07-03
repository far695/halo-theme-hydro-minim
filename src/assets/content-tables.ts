const richTableFigureClass = "hydro-rich-table-figure";
const titledRichTableFigureClass = "hydro-rich-table-figure--titled";
const richTableTitleClass = "hydro-rich-table-title";

function isDirectFigureCaption(element: Element) {
  return element.tagName === "FIGCAPTION";
}

function findDirectFigureCaption(figure: HTMLElement) {
  return Array.from(figure.children).find(isDirectFigureCaption) as HTMLElement | undefined;
}

function findTableFigure(table: HTMLTableElement) {
  const figure = table.closest<HTMLElement>("figure");
  return figure?.contains(table) ? figure : null;
}

function findTableOnlyParent(table: HTMLTableElement) {
  const parent = table.parentElement;
  if (!parent || parent.children.length !== 1 || parent.firstElementChild !== table) {
    return null;
  }

  return parent;
}

function isEditorTableScrollWrapper(element: HTMLElement | null) {
  if (!element || element.tagName !== "DIV") {
    return false;
  }

  const overflowX = element.style.overflowX.trim().toLowerCase();
  const overflowY = element.style.overflowY.trim().toLowerCase();
  return overflowX === "auto" || overflowX === "scroll" || overflowY === "hidden";
}

function hasEditorTableColumnMetadata(table: HTMLTableElement) {
  return table.querySelector("[colwidth], colgroup col[style*='width']") != null;
}

function looksLikeHaloEditorTable(table: HTMLTableElement) {
  const figure = findTableFigure(table);
  const wrapper = findTableOnlyParent(table);

  if (isEditorTableScrollWrapper(wrapper) || hasEditorTableColumnMetadata(table)) {
    return true;
  }

  return Boolean(
    (figure && figure.classList.contains("table")) ||
    figure?.dataset.contentType === "table" ||
    (figure && findDirectFigureCaption(figure) != null),
  );
}

function reuseContentTableWrapper(table: HTMLTableElement, wrapperClasses: string[]) {
  const parent = table.parentElement;

  if (!parent) {
    return null;
  }

  if (wrapperClasses.some((className) => parent.classList.contains(className))) {
    parent.classList.add(...wrapperClasses);
    return parent;
  }

  if (parent.tagName === "DIV" && parent.children.length === 1 && parent.firstElementChild === table) {
    parent.classList.add(...wrapperClasses);
    return parent;
  }

  return null;
}

function markTableTitle(table: HTMLTableElement, isHaloEditorTable: boolean) {
  const caption = table.caption;
  if (caption && caption.textContent?.trim()) {
    caption.classList.add(richTableTitleClass);
  }

  const figure = findTableFigure(table);
  if (!figure) {
    return;
  }

  const figureCaption = findDirectFigureCaption(figure);
  const hasFigureTitle = Boolean(figureCaption?.textContent?.trim());

  if (isHaloEditorTable || hasFigureTitle) {
    figure.classList.add(richTableFigureClass);
  }

  if (hasFigureTitle && figureCaption) {
    figure.classList.add(titledRichTableFigureClass);
    figureCaption.classList.add(richTableTitleClass);
  }
}

function resetGeneratedTableRowMarks(table: HTMLTableElement) {
  table.querySelectorAll<HTMLElement>("[data-hydro-table-head-row]").forEach((row) => {
    row.removeAttribute("data-hydro-table-head-row");
  });
}

function markTableSections(table: HTMLTableElement, isHaloEditorTable: boolean) {
  resetGeneratedTableRowMarks(table);

  table.dataset.hydroTableSource = isHaloEditorTable ? "halo-editor" : "html";

  if (table.tFoot) {
    table.tFoot.dataset.hydroTableFoot = "";
  }

  if (table.tHead) {
    return;
  }

  const firstBodyRow = table.tBodies.item(0)?.rows.item(0);
  if (!firstBodyRow) {
    return;
  }

  const firstRowHasHeaderCells = firstBodyRow.querySelector("th") != null;
  if (firstRowHasHeaderCells) {
    firstBodyRow.setAttribute("data-hydro-table-head-row", "");
  }
}

export function enhanceContentTables(content: HTMLElement, tableWrapClass = "hydro-post-table-wrap") {
  const wrapperClasses = tableWrapClass.split(/\s+/).filter(Boolean);
  if (wrapperClasses.length === 0) {
    return;
  }

  content.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    const isHaloEditorTable = looksLikeHaloEditorTable(table);

    markTableTitle(table, isHaloEditorTable);
    markTableSections(table, isHaloEditorTable);

    if (reuseContentTableWrapper(table, wrapperClasses)) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.classList.add(...wrapperClasses);
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.append(table);
  });
}
