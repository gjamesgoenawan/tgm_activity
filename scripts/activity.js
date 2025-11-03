import { 
  listWeeks,
  readAllianceStats,
  readMemberStats,
  readMembers,
  formatNumber,
  latestWeek,
  getUpdateTime
} from "./data_ops.js";

let members = {};
let sortState = {};          
let globalData = [];

const weekSelect = document.getElementById("week-select");
const accordionContainer = document.getElementById("accordion-container");
const mobileSortSelect = document.getElementById("mobile-sort-select");
const mobileSortBar = document.getElementById("mobile-sort-bar");

(async function init() {
  members = await readMembers();
  const weeks = await listWeeks();
  const latest = await latestWeek();

  for (let i = weeks.length - 1; i >= 0; i--) {
    const formattedDate = await getUpdateTime(i);
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Week ${i} - ${formattedDate}`;
    weekSelect.appendChild(opt);
  }

  weekSelect.value = latest;
  await loadAndRender(latest);

  const footerDiv = document.getElementById("footer-updated");
  if (footerDiv) {
    const formattedDate = await getUpdateTime(latest);
    footerDiv.textContent = `Latest update: ${formattedDate}`;
  }

  handleViewportChange();
  window.addEventListener("resize", handleViewportChange);

  if (mobileSortSelect) {
    mobileSortSelect.addEventListener("change", () => {
      const val = mobileSortSelect.value;
      const [col, dir] = val.split(":");
      const asc = dir === "asc";
      sortState = { [col]: asc };
      const sorted = sortData(col, asc);
      renderTable(sorted);
      renderAccordion(sorted);
      updateSortIndicators();
    });
  }
})();

weekSelect.addEventListener("change", async () => {
  await loadAndRender(weekSelect.value);
});

async function loadAndRender(weekNum) {
  globalData = await readMemberStats(weekNum);
  sortState = { rank: true };
  const sorted = sortData("rank", true);

  renderTable(sorted);
  renderAccordion(sorted);
  renderStats(weekNum);
  updateSortIndicators();
}

function renderStats(weekNum) {
  const container = document.getElementById("stats-container");
  container.innerHTML = "";

  readAllianceStats(Number(weekNum)).then(({ data }) => {
    const labels = {
      average_power: "Avg. Power",
      average_power_increase: "Avg. Δ Power",
      average_help: "Avg. Helps",
      average_tech: "Avg. Tech",
      average_build: "Avg. Build"
    };

    Object.entries(labels).forEach(([key, title]) => {
      const arr = data?.[key] || [0, 0];
      container.innerHTML += `
        <div class="stat-card">
          <div class="stat-title">${title}</div>
          <div class="stat-value">
            ${formatNumber(arr[0])}
            <br>
            <span style="font-size:0.6em;color:gray;">± ${formatNumber(arr[1])}</span>
          </div>
        </div>
      `;
    });
  });
}

function sortData(col, asc) {
  return [...globalData].sort((a, b) => {
    const va = a[col], vb = b[col];
    if (va === "-" || va == null) return 1;
    if (vb === "-" || vb == null) return -1;
    if (isNaN(va) || isNaN(vb))
      return asc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    return asc ? va - vb : vb - va;
  });
}

/* ---------- Desktop table render ---------- */
function renderTable(rows) {
  const tbody = document.querySelector("#data-table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  rows.forEach(row => {
    const name = members[row.id]?.name || row.id;
    const newTag = row.new ? `<sup class="new-tag">NEW</sup>` : "";
    let bg = "";
    if (row.rank === 1) bg = "#5d4f03ff";
    else if (row.rank === 2) bg = "#565656ff";
    else if (row.rank === 3) bg = "#583512ff";

    tbody.innerHTML += `
      <tr style="background:${bg}">
        <td>${formatNumber(row.rank)}</td>
        <td style="text-align: left;">${name}${newTag}</td>
        <td>${formatNumber(row.power)}</td>
        <td>${formatNumber(row.power_increase)}</td>
        <td>${formatNumber(row.help)}</td>
        <td>${formatNumber(row.tech)}</td>
        <td>${formatNumber(row.build)}</td>
        <td>${formatNumber(row.scores)}</td>
      </tr>
    `;
  });
}

/* ---------- Mobile accordion render (now matches CSS) ---------- */
function renderAccordion(rows) {
  if (!accordionContainer) return;

  // ensure the container has the CSS class so styles apply even if HTML missed it
  accordionContainer.classList.add("member-accordion");
  accordionContainer.innerHTML = "";

  rows.forEach((row, idx) => {
    const name = members[row.id]?.name || row.id;
    const newTag = row.new ? `<sup class="new-tag">NEW</sup>` : "";
    const rank = formatNumber(row.rank);
    const score = formatNumber(row.scores);

    let accentClass = "";
    if (row.rank === 1) accentClass = "accent-1";
    else if (row.rank === 2) accentClass = "accent-2";
    else if (row.rank === 3) accentClass = "accent-3";

    // index-based idSafe is robust against special chars & collisions
    const idSafe = `acc-${idx}-${String(row.id).replace(/[^a-z0-9-_]/gi, "") || "member"}`;

    const contentHtml = `
      <div class="member-accordion__stat-row">
        <div class="member-accordion__stat"><strong>Power</strong><br>${formatNumber(row.power)}</div>
        <div class="member-accordion__stat"><strong>Δ Power</strong><br>${formatNumber(row.power_increase)}</div>
        <div class="member-accordion__stat"><strong>Help</strong><br>${formatNumber(row.help)}</div>
        <div class="member-accordion__stat"><strong>Tech</strong><br>${formatNumber(row.tech)}</div>
        <div class="member-accordion__stat"><strong>Build</strong><br>${formatNumber(row.build)}</div>
        <div class="member-accordion__stat"><strong>Scores</strong><br>${formatNumber(row.scores)}</div>
      </div>
    `;

    const item = document.createElement("div");
    item.className = `member-accordion__item ${accentClass}`;
    item.innerHTML = `
      <button class="member-accordion__header" aria-expanded="false" aria-controls="${idSafe}" id="${idSafe}-btn" type="button">
        <span class="member-accordion__header-left">
          <span class="member-accordion__rank">${rank}</span>
          <span class="member-accordion__player">${name}${newTag}</span>
        </span>
        <span class="member-accordion__header-right">
          <span class="member-accordion__score">${score}</span>
          <span class="member-accordion__chev">▶</span>
        </span>
      </button>
      <div class="member-accordion__content" id="${idSafe}" role="region" aria-labelledby="${idSafe}-btn">
        ${contentHtml}
      </div>
    `;
    accordionContainer.appendChild(item);
  });

  // attach toggle handlers (with keyboard support)
  accordionContainer.querySelectorAll(".member-accordion__header").forEach(btn => {
    btn.onclick = () => {
      const parent = btn.closest(".member-accordion__item");
      if (!parent) return;
      const expanded = btn.getAttribute("aria-expanded") === "true";

      // collapse others (single-open behavior)
      accordionContainer.querySelectorAll(".member-accordion__item").forEach(it => {
        if (it === parent) return;
        it.classList.remove("expanded");
        const h = it.querySelector(".member-accordion__header");
        if (h) h.setAttribute("aria-expanded", "false");
      });

      if (expanded) {
        parent.classList.remove("expanded");
        btn.setAttribute("aria-expanded", "false");
      } else {
        parent.classList.add("expanded");
        btn.setAttribute("aria-expanded", "true");
      }
    };

    btn.addEventListener("keydown", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        btn.click();
      }
    });
  });
}

/* ---------- Sorting UI & behavior ---------- */
function updateSortIndicators() {
  document.querySelectorAll("#data-table th").forEach(th => {
    const col = th.dataset.col;
    const asc = sortState[col];
    const base = th.textContent.replace(/[↑↓]/g, "").trim();
    th.textContent = asc === undefined ? base : `${base} ${asc ? "↑" : "↓"}`;
  });

  if (mobileSortSelect) {
    const activeCol = Object.keys(sortState)[0];
    const activeAsc = sortState[activeCol];
    const want = `${activeCol}:${activeAsc ? "asc" : "desc"}`;
    for (let opt of mobileSortSelect.options) {
      if (opt.value === want) {
        mobileSortSelect.value = want;
        break;
      }
    }
  }
}

document.querySelectorAll("#data-table th").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    const asc = !sortState[col];
    sortState = { [col]: asc };
    const sorted = sortData(col, asc);
    renderTable(sorted);
    renderAccordion(sorted);
    updateSortIndicators();
  });
});

/* ---------- viewport helper ---------- */
function handleViewportChange() {
  const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
  if (mobileSortBar) mobileSortBar.style.display = isMobile ? "block" : "none";
  if (mobileSortBar) mobileSortBar.setAttribute("aria-hidden", !isMobile);
}
