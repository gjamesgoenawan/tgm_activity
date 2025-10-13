let data = [];
let members = {};
let sortState = {};
let allianceStats = {};
const weekSelect = document.getElementById("week-select");

Promise.all([
  fetch("db_output/members.json").then(res => res.json()),
  fetch("db_output/weeks.json").then(res => res.json()),
  fetch("db_output/alliance_stats.json").then(res => res.json())
])
.then(([membersJson, weeksJson, allianceStatsJson]) => {
  members = membersJson;
  weeks = weeksJson;
  allianceStats = allianceStatsJson;
  const weekKeys = Object.keys(weeks).map(Number);
  for (let i = weekKeys.length - 1; i >= 0; i--) {
    const weekInfo = weeks[i];
    const dateStr = `${weekInfo.date}/${weekInfo.month}/${weekInfo.year}`;
    
    const opt = document.createElement("option");
    opt.value = i; // store week number directly!
    opt.textContent = `Week ${i} - ${dateStr}`;
    weekSelect.appendChild(opt);
  }
  
  // Default: latest week
  weekSelect.selectedIndex = 0;
  const weekNum = weekSelect.value;
  loadWeek(`db_output/stats/week_${weekNum}.json`);
  renderStats(weekNum);
});

// Handle dropdown change
weekSelect.addEventListener("change", () => {
  const weekNum = weekSelect.value;
  loadWeek(`db_output/stats/week_${weekNum}.json`);
  renderStats(weekNum);
});

// Render Stats Cards
function renderStats(weekNum) {
  const container = document.getElementById("stats-container");
  container.innerHTML = "";

  const stats = allianceStats[weekNum] || {};
  const labels = {
    average_power: "Average Power",
    average_power_increase: "Average Δ Power",
    average_help: "Average Help",
    average_tech: "Average Tech",
    average_build: "Average Build"
  };
  console.log(weekNum)
  Object.entries(labels).forEach(([key, title]) => {
    const arr = stats[key] || [0, 0];
    const mean = formatNumber(arr[0]);
    const std = formatNumber(arr[1]);

    const card = document.createElement("div");
    card.className = "stat-card";
    card.innerHTML = `
      <div class="stat-title">${title}</div>
      <div class="stat-value">
        <div>${mean}</div>
        <div style="font-size: 0.6em; color: gray;">± ${std}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

function formatNumber(val) {
  if (val === "-" || val === null || val === undefined) {
    return "-";
  }
  return Number(val).toLocaleString();
}

function sortData(col, asc) {
  return [...data].sort((a, b) => {
    const va = a[col];
    const vb = b[col];

    // Handle "-" cases
    const aIsDash = va === "-";
    const bIsDash = vb === "-";

    if (aIsDash && bIsDash) return 0;
    if (aIsDash) return 1; 
    if (bIsDash) return -1;

    // Normal string vs formatNumber comparison
    if (isNaN(va) || isNaN(vb)) {
      return asc ? String(va).localeCompare(String(vb)) 
                 : String(vb).localeCompare(String(va));
    } else {
      return asc ? va - vb : vb - va;
    }
  });
}

function updateSortIndicators() {
  document.querySelectorAll("#data-table th").forEach(th => {
    const col = th.dataset.col;
    const asc = sortState[col];
    const base = th.textContent.replace(/[↑\↓]/g, "");
    if (asc === undefined) {
      th.textContent = base;
    } else {
      th.textContent = asc ? `${base} ↑` : `${base} ↓`;
    }
  });
}

function loadWeek(path) {
  fetch(path)
    .then(res => res.json())
    .then(json => {
      data = Object.entries(json).map(([id, vals]) => ({ id, ...vals }));

      sortState = { rank: true };
      const sorted = sortData("rank", true);

      renderTable(sorted);
      updateSortIndicators();
    })
    .catch(err => {
      console.error("Error loading JSON:", err);
      document.querySelector("#data-table tbody").innerHTML =
        `<tr><td colspan="7">Error loading ${path}</td></tr>`;
    });
}

function renderTable(rows) {
  const tbody = document.querySelector("#data-table tbody");
  tbody.innerHTML = "";
  
  rows.forEach(row => {
    const memberInfo = members[row.id] || {};
    const displayName = memberInfo.name || row.id; // fallback to ID
    const newTag = row.new ? `<sup style="color:red;font-weight:bold;"> NEW</sup>` : "";

    // Fun background color for top 3.
    let bgColor = "";
    if (row.rank === 1) bgColor = "#5d4f03ff"; 
    else if (row.rank === 2) bgColor = "#565656ff";
    else if (row.rank === 3) bgColor = "#583512ff";

    tbody.innerHTML += `
      <tr style="background-color: ${bgColor};">
        <td>${formatNumber(row.rank)}</td>
        <td style="text-align: left;">${displayName}${newTag}</td>
        <td>${formatNumber(row.power)}</td>
        <td>${formatNumber(row.power_increase)}</td>
        <td>${formatNumber(row.help)}</td>
        <td>${formatNumber(row.tech)}</td>
        <td>${formatNumber(row.build)}</td>
        <td>${formatNumber(row.scores)}</td>
      </tr>`;
  });
}

// Sorting logic
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
