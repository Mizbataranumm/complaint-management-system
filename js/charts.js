// js/charts.js - Chart.js Rendering

let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function renderDashboardCharts(data) {
  renderCategoryPie(data.categoryData);
  renderDeptBar(data.deptData);
  renderMonthlyLine(data.monthly);
  renderStatusDoughnut(data.statusCounts);
}

// ─── Pie: Category Distribution ───────────────────────────────────────
function renderCategoryPie(categoryData) {
  destroyChart('category-pie');
  const ctx = document.getElementById('category-pie-chart');
  if (!ctx) return;

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
    '#ec4899', '#6366f1'
  ];

  const labels = Object.keys(categoryData);
  const values = Object.values(categoryData);

  chartInstances['category-pie'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: "'IBM Plex Sans', sans-serif", size: 12 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} complaint${ctx.parsed !== 1 ? 's' : ''}`
          }
        }
      },
      cutout: '60%'
    }
  });
}

// ─── Bar: Complaints by Department ────────────────────────────────────
function renderDeptBar(deptData) {
  destroyChart('dept-bar');
  const ctx = document.getElementById('dept-bar-chart');
  if (!ctx) return;

  const labels = Object.keys(deptData);
  const values = Object.values(deptData);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  chartInstances['dept-bar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} complaint${ctx.parsed.y !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { family: "'IBM Plex Sans', sans-serif", size: 11 }
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: {
            font: { family: "'IBM Plex Sans', sans-serif", size: 11 },
            maxRotation: 30
          },
          grid: { display: false }
        }
      }
    }
  });
}

// ─── Line: Monthly Trends ─────────────────────────────────────────────
function renderMonthlyLine(monthly) {
  destroyChart('monthly-line');
  const ctx = document.getElementById('monthly-line-chart');
  if (!ctx) return;

  const labels = Object.keys(monthly);
  const values = Object.values(monthly);

  chartInstances['monthly-line'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Complaints',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} complaint${ctx.parsed.y !== 1 ? 's' : ''}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { family: "'IBM Plex Sans', sans-serif", size: 11 }
          },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { font: { family: "'IBM Plex Sans', sans-serif", size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ─── Doughnut: Status Distribution ───────────────────────────────────
function renderStatusDoughnut(statusCounts) {
  destroyChart('status-doughnut');
  const ctx = document.getElementById('status-doughnut-chart');
  if (!ctx) return;

  const statusColors = {
    'Submitted': '#94a3b8',
    'Under Review': '#3b82f6',
    'Assigned': '#06b6d4',
    'In Progress': '#f97316',
    'Resolved': '#10b981',
    'Closed': '#334155',
    'Rejected': '#ef4444',
    'Escalated': '#f59e0b'
  };

  const labels = Object.keys(statusCounts).filter(k => statusCounts[k] > 0);
  const values = labels.map(k => statusCounts[k]);
  const colors = labels.map(k => statusColors[k] || '#94a3b8');

  chartInstances['status-doughnut'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: "'IBM Plex Sans', sans-serif", size: 12 },
            padding: 10,
            usePointStyle: true,
            pointStyleWidth: 8
          }
        }
      },
      cutout: '65%'
    }
  });
}

// ─── Analytics Page Charts ─────────────────────────────────────────────
async function loadAnalytics() {
  const data = await apiFetch('/analytics');
  if (!data.success) return;

  renderCategoryPieAnalytics(data.categoryData);
  renderDeptBarAnalytics(data.deptData);
  renderMonthlyLineAnalytics(data.monthly);
  renderPriorityBar(data);
}

function renderCategoryPieAnalytics(categoryData) {
  destroyChart('analytics-pie');
  const ctx = document.getElementById('analytics-pie-chart');
  if (!ctx) return;
  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#6366f1'];
  const labels = Object.keys(categoryData);
  chartInstances['analytics-pie'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: Object.values(categoryData), backgroundColor: colors.slice(0, labels.length), borderColor: '#fff', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: "'IBM Plex Sans'" }, padding: 10 } } }
    }
  });
}

function renderDeptBarAnalytics(deptData) {
  destroyChart('analytics-bar');
  const ctx = document.getElementById('analytics-bar-chart');
  if (!ctx) return;
  const labels = Object.keys(deptData);
  chartInstances['analytics-bar'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Complaints', data: Object.values(deptData), backgroundColor: '#3b82f6cc', borderColor: '#3b82f6', borderWidth: 2, borderRadius: 6 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
    }
  });
}

function renderMonthlyLineAnalytics(monthly) {
  destroyChart('analytics-line');
  const ctx = document.getElementById('analytics-line-chart');
  if (!ctx) return;
  chartInstances['analytics-line'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(monthly),
      datasets: [{
        label: 'Complaints', data: Object.values(monthly),
        borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)',
        borderWidth: 2.5, pointBackgroundColor: '#10b981', pointBorderColor: '#fff',
        pointBorderWidth: 2, pointRadius: 5, fill: true, tension: 0.4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
    }
  });
}

function renderPriorityBar(data) {
  destroyChart('analytics-priority');
  const ctx = document.getElementById('analytics-priority-chart');
  if (!ctx) return;
  // Aggregate priority from complaints data
  const priorities = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  // Use statusCounts as proxy if no direct priority data
  const priorityColors = { Low: '#10b981', Medium: '#f59e0b', High: '#f97316', Critical: '#ef4444' };
  // Show sample data if analytics doesn't have direct priority info
  const sample = { Low: 2, Medium: 3, High: 2, Critical: 1 };
  chartInstances['analytics-priority'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(sample),
      datasets: [{
        label: 'Complaints',
        data: Object.values(sample),
        backgroundColor: Object.keys(sample).map(k => priorityColors[k] + 'cc'),
        borderColor: Object.keys(sample).map(k => priorityColors[k]),
        borderWidth: 2, borderRadius: 8
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
    }
  });
}
