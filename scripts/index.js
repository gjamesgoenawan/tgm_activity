import { readAllianceStats, formatNumber, latestWeek, getUpdateTime } from "./data_ops.js";

export async function loadLatestAllianceStats() {
  const container = document.getElementById("stats-container");
  if (!container) return;

  try {
    // Get the latest week number
    const week = await latestWeek();

    // Fetch stats for the latest week
    const { data } = await readAllianceStats(week);

    // Labels for cards
    const labels = {
      average_power: "Avg. Power",
      average_power_increase: "Avg. Δ Power",
      average_help: "Avg. Alliance Help",
      average_tech: "Avg. Tech Donation",
      average_build: "Avg. Build Contribution"
    };

    // Build HTML
    let html = ``;

    for (const [key, label] of Object.entries(labels)) {
      const arr = data?.[key] || [0, 0];
      html += `
        <div class="stat-card">
          <div class="stat-title">${label}</div>
          <div class="stat-value">
            ${formatNumber(arr[0])}
            <div style="font-size:0.6em;color:gray;">± ${formatNumber(arr[1])}</div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Inject latest update using getUpdateTime
    const footerDiv = document.getElementById("footer-updated");
    if (footerDiv) {
      const formattedDate = await getUpdateTime(week);
      footerDiv.textContent = `Latest update: ${formattedDate}`;
    }

  } catch (err) {
    console.error("Error loading alliance stats:", err);
    container.innerHTML = `<p>Error loading alliance statistics</p>`;
  }
}

// Load MOTD from assets/motd.txt
fetch('assets/motd.txt')
  .then(response => response.text())
  .then(text => {
    document.getElementById('motd-text').innerText = text.trim() || "No message today.";
  })
  .catch(err => {
    document.getElementById('motd-text').innerText = "Failed to load message.";
    console.error(err);
  });
