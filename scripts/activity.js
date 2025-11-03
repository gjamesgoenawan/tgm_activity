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

(async function init() {
  members = await readMembers();
  const weeks = await listWeeks();
  const latest = await latestWeek(); // Use latest week

  // Populate dropdown with formatted update dates
  for (let i = weeks.length - 1; i >= 0; i--) {
    const formattedDate = await getUpdateTime(i);

    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `Week ${i} - ${formattedDate}`;
    weekSelect.appendChild(opt);
  }

  // Select the latest week by default
  weekSelect.value = latest;
  await loadAndRender(latest);

  // Inject latest update into footer
  const footerDiv = document.getElementById("footer-updated");
  if (footerDiv) {
    const formattedDate = await getUpdateTime(latest);
    footerDiv.textContent = `Latest update: ${formattedDate}`;
  }
})();

weekSelect.addEventListener("change", async () => {
  await loadAndRender(weekSelect.value);
});

async function loadAndRender(weekNum) {
  globalData = await readMemberStats(weekNum);
  const sorted = sortData("rank", true);

  renderTable(sorted);
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

function renderTable(rows) {
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = "";
  rows.forEach(row => {
    const name = members[row.id]?.name || row.id;
    const newTag = row.new ? `<sup style="color:red;font-weight:bold;"> NEW</sup>` : "";
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

function updateSortIndicators() {
  document.querySelectorAll("#data-table th").forEach(th => {
    const col = th.dataset.col;
    const asc = sortState[col];
    const base = th.textContent.replace(/[↑↓]/g, "");
    th.textContent = asc === undefined ? base : base + (asc ? " ↑" : " ↓");
  });
}

document.querySelectorAll("#data-table th").forEach(th => {
  th.addEventListener("click", () => {
    const col = th.dataset.col;
    const asc = !sortState[col];
    sortState = { [col]: asc };
    const sorted = sortData(col, asc);
    renderTable(sorted);
    updateSortIndicators();
  });
});
