/**
 * IPL Analytics Dashboard Frontend Application Logic
 */

const USE_REAL_BACKEND = true;
const BACKEND_BASE_URL = '/api';

// Chart Instances
let batterChart = null;
let bowlerChart = null;
let teamChart = null;
let venueChart = null;

// Initialize Theme, Icons & Autocomplete on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    lucide.createIcons();
    populateSeasonDropdown();
    setupAutocompleteListeners();
    loadDefaultBatter('Mohammed Siraj');
    loadDefaultBowler('Jasprit Bumrah');
    loadDefaultTeam('rcb');
    loadDefaultSeason(2023);
    loadDefaultVenue('Chinnaswamy');
    loadDefaultComparison('Virat Kohli', 'Rohit Sharma');
});

/* ==========================================================================
   THEME TOGGLE SYSTEM (LIGHT / DARK MODE)
   ========================================================================== */

function initTheme() {
    const userTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (userTheme === 'dark' || (!userTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        showSunIcon();
    } else {
        document.documentElement.classList.remove('dark');
        showMoonIcon();
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if (isDark) {
        showSunIcon();
    } else {
        showMoonIcon();
    }

    refreshActiveCharts();
}

function showSunIcon() {
    document.getElementById('theme-toggle-dark-icon')?.classList.add('hidden');
    document.getElementById('theme-toggle-light-icon')?.classList.remove('hidden');
}

function showMoonIcon() {
    document.getElementById('theme-toggle-light-icon')?.classList.add('hidden');
    document.getElementById('theme-toggle-dark-icon')?.classList.remove('hidden');
}

function isDarkModeActive() {
    return document.documentElement.classList.contains('dark');
}

function getChartColors() {
    const dark = isDarkModeActive();
    return {
        text: dark ? '#94a3b8' : '#475569',
        grid: dark ? '#1e293b' : '#e2e8f0',
        bgPrimary: dark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(0, 75, 160, 0.8)',
        borderPrimary: dark ? '#38bdf8' : '#004ba0'
    };
}

function refreshActiveCharts() {
    const currentTab = document.querySelector('.tab-btn.active')?.id.replace('tab-', '');
    if (currentTab === 'batter') loadDefaultBatter(document.getElementById('batter-display-name').textContent);
    if (currentTab === 'bowler') loadDefaultBowler(document.getElementById('bowler-display-name').textContent);
    if (currentTab === 'team') loadDefaultTeam(document.getElementById('team-search-input').value || 'rcb');
    if (currentTab === 'venue') loadDefaultVenue(document.getElementById('venue-display-name').textContent);
}

/* ==========================================================================
   TAB SWITCHING LOGIC
   ========================================================================== */

function switchTab(tabName) {
    const tabs = ['batter', 'bowler', 'team', 'season', 'venue', 'comparison'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const section = document.getElementById(`section-${t}`);
        
        if (t === tabName) {
            btn.classList.add('active');
            section.classList.remove('hidden');
        } else {
            btn.classList.remove('active');
            section.classList.add('hidden');
        }
    });

    closeAllAutocompletePanels();
    lucide.createIcons();
}

/* ==========================================================================
   LIVE AUTOCOMPLETE SUGGESTIONS SYSTEM
   ========================================================================== */

function setupAutocompleteListeners() {
    attachAutocomplete('batter-search-input', 'batter', (val) => loadDefaultBatter(val));
    attachAutocomplete('bowler-search-input', 'bowler', (val) => loadDefaultBowler(val));
    attachAutocomplete('team-search-input', 'team', (val) => loadDefaultTeam(val));
    attachAutocomplete('venue-search-input', 'venue', (val) => loadDefaultVenue(val));
    attachAutocomplete('comp-p1-input', 'batter');
    attachAutocomplete('comp-p2-input', 'batter');

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-panel') && !e.target.matches('input')) {
            closeAllAutocompletePanels();
        }
    });
}

function attachAutocomplete(inputId, searchType, onSelectCallback = null) {
    const input = document.getElementById(inputId);
    if (!input) return;

    // Wrap input container if needed
    const parent = input.parentElement;
    if (!parent.classList.contains('relative')) {
        parent.classList.add('relative');
    }

    let panel = document.createElement('div');
    panel.className = 'autocomplete-panel hidden absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs';
    parent.appendChild(panel);

    let debounceTimer;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();

        if (query.length < 1) {
            panel.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${BACKEND_BASE_URL}/suggest?q=${encodeURIComponent(query)}&type=${searchType}`);
                const suggestions = await res.json();
                renderSuggestions(panel, input, suggestions, onSelectCallback);
            } catch (err) {
                console.error("Autocomplete error:", err);
            }
        }, 150);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') panel.classList.add('hidden');
    });
}

function renderSuggestions(panel, input, list, onSelectCallback) {
    panel.innerHTML = '';
    if (!list || list.length === 0) {
        panel.classList.add('hidden');
        return;
    }

    list.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'px-3 py-2 text-slate-800 dark:text-slate-200 hover:bg-brand-50 dark:hover:bg-slate-800 hover:text-brand-600 dark:hover:text-sky-400 cursor-pointer font-medium flex items-center justify-between transition-colors';
        itemEl.innerHTML = `<span>${item}</span><i data-lucide="chevron-right" class="w-3.5 h-3.5 opacity-50"></i>`;
        
        itemEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = item;
            panel.classList.add('hidden');
            if (onSelectCallback) {
                onSelectCallback(item);
            }
        });

        panel.appendChild(itemEl);
    });

    panel.classList.remove('hidden');
    lucide.createIcons();
}

function closeAllAutocompletePanels() {
    document.querySelectorAll('.autocomplete-panel').forEach(p => p.classList.add('hidden'));
}

/* ==========================================================================
   API SERVICE LAYER
   ========================================================================== */

const apiService = {

    async getBatterAnalysis(name, exact = null) {
        if (USE_REAL_BACKEND) {
            try {
                let url = `${BACKEND_BASE_URL}/batter?name=${encodeURIComponent(name)}`;
                if (exact) url += `&exact=${encodeURIComponent(exact)}`;
                const res = await fetch(url);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        return { name: name, matches: 0, runs: 0, balls: 0, strikeRate: 0, average: 0, highestScore: 0, fours: 0, sixes: 0, boundaries: 0, seasonRuns: {} };
    },

    async getBowlerAnalysis(name, exact = null) {
        if (USE_REAL_BACKEND) {
            try {
                let url = `${BACKEND_BASE_URL}/bowler?name=${encodeURIComponent(name)}`;
                if (exact) url += `&exact=${encodeURIComponent(exact)}`;
                const res = await fetch(url);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        return { name: name, matches: 0, balls: 0, runsConceded: 0, wickets: 0, economy: 0, bowlingAvg: 0, bestWickets: 0, bestRuns: 0, seasonWickets: {} };
    },

    async getTeamAnalysis(teamOrAlias) {
        if (USE_REAL_BACKEND) {
            try {
                const res = await fetch(`${BACKEND_BASE_URL}/team?team=${encodeURIComponent(teamOrAlias)}`);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        return { teamName: teamOrAlias, matches: 0, wins: 0, losses: 0, winPercentage: 0, totalRuns: 0, totalWickets: 0, avgRunsPerMatch: 0, seasonPerformance: [] };
    },

    async getSeasonAnalysis(seasonYear) {
        if (USE_REAL_BACKEND) {
            try {
                const res = await fetch(`${BACKEND_BASE_URL}/season?year=${seasonYear}`);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        return { season: seasonYear, matches: 0, orangeCap: 'N/A', purpleCap: 'N/A', highestIndividualScore: 'N/A', highestTeamScore: 'N/A', lowestTeamScore: 'N/A', standings: [] };
    },

    async getVenueAnalysis(venueName) {
        if (USE_REAL_BACKEND) {
            try {
                const res = await fetch(`${BACKEND_BASE_URL}/venue?name=${encodeURIComponent(venueName)}`);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        return { venueName: venueName, matches: 0, averageScore: 0, highestScore: 'N/A', lowestScore: 'N/A', winsBattingFirst: 0, winsChasing: 0 };
    },

    async getPlayerComparison(p1Name, p2Name) {
        if (USE_REAL_BACKEND) {
            try {
                const res = await fetch(`${BACKEND_BASE_URL}/compare?p1=${encodeURIComponent(p1Name)}&p2=${encodeURIComponent(p2Name)}`);
                return await res.json();
            } catch (err) {
                console.error("API error:", err);
            }
        }
        const p1Data = await this.getBatterAnalysis(p1Name);
        const p2Data = await this.getBatterAnalysis(p2Name);
        const p1Bow = await this.getBowlerAnalysis(p1Name);
        const p2Bow = await this.getBowlerAnalysis(p2Name);
        return { p1: { name: p1Name, bat: p1Data, bow: p1Bow }, p2: { name: p2Name, bat: p2Data, bow: p2Bow } };
    }
};

/* ==========================================================================
   UI CONTROLLERS & CHART HANDLERS
   ========================================================================== */

// 1. BATTER HANDLERS
async function loadDefaultBatter(name, exact = null) {
    clearCandidateBox('batter');
    const data = await apiService.getBatterAnalysis(name, exact);
    
    if (data && data.multiple) {
        renderCandidateBox('batter', name, data.candidates, (selected) => {
            loadDefaultBatter(name, selected);
        });
    } else if (data && !data.error) {
        updateBatterUI(data);
    } else {
        alert(data?.error || `Player ${name} not found`);
    }
}

function handleBatterSearch(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const input = document.getElementById('batter-search-input').value.trim();
    if (input) loadDefaultBatter(input);
}

function updateBatterUI(data) {
    document.getElementById('batter-display-name').textContent = data.name;
    document.getElementById('batter-matches').textContent = data.matches;
    document.getElementById('batter-runs').textContent = data.runs;
    document.getElementById('batter-balls').textContent = data.balls;
    document.getElementById('batter-sr').textContent = data.strikeRate;
    document.getElementById('batter-avg').textContent = data.average;
    document.getElementById('batter-highest').textContent = data.highestScore;
    document.getElementById('batter-fours').textContent = data.fours;
    document.getElementById('batter-sixes').textContent = data.sixes;
    document.getElementById('batter-boundaries').textContent = data.boundaries;
    document.getElementById('batter-fh').textContent = data.fiftyHundred || `${data.fifties || 0} / ${data.hundreds || 0}`;

    const colors = getChartColors();
    const ctx = document.getElementById('batter-season-chart').getContext('2d');
    if (batterChart) batterChart.destroy();

    const seasonRuns = data.seasonRuns || {};
    batterChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(seasonRuns),
            datasets: [{
                label: 'Runs Scored',
                data: Object.values(seasonRuns),
                backgroundColor: colors.bgPrimary,
                borderColor: colors.borderPrimary,
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });
}

// 2. BOWLER HANDLERS
async function loadDefaultBowler(name, exact = null) {
    clearCandidateBox('bowler');
    const data = await apiService.getBowlerAnalysis(name, exact);
    
    if (data && data.multiple) {
        renderCandidateBox('bowler', name, data.candidates, (selected) => {
            loadDefaultBowler(name, selected);
        });
    } else if (data && !data.error) {
        updateBowlerUI(data);
    } else {
        alert(data?.error || `Bowler ${name} not found`);
    }
}

function handleBowlerSearch(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const input = document.getElementById('bowler-search-input').value.trim();
    if (input) loadDefaultBowler(input);
}

function updateBowlerUI(data) {
    document.getElementById('bowler-display-name').textContent = data.name;
    document.getElementById('bowler-matches').textContent = data.matches;
    document.getElementById('bowler-balls').textContent = data.balls;
    document.getElementById('bowler-runs').textContent = data.runsConceded;
    document.getElementById('bowler-wickets').textContent = data.wickets;
    document.getElementById('bowler-economy').textContent = data.economy;
    document.getElementById('bowler-avg').textContent = data.bowlingAvg;
    document.getElementById('bowler-best').textContent = `${data.bestWickets} / ${data.bestRuns}`;
    document.getElementById('bowler-fifers').textContent = data.fifers || 0;

    const colors = getChartColors();
    const ctx = document.getElementById('bowler-season-chart').getContext('2d');
    if (bowlerChart) bowlerChart.destroy();

    const seasonWickets = data.seasonWickets || {};
    bowlerChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(seasonWickets),
            datasets: [{
                label: 'Wickets Taken',
                data: Object.values(seasonWickets),
                backgroundColor: isDarkModeActive() ? 'rgba(168, 85, 247, 0.7)' : 'rgba(126, 34, 206, 0.8)',
                borderColor: isDarkModeActive() ? '#A855F7' : '#7e22ce',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });
}

// MULTIPLE CANDIDATES SELECTION UI
function renderCandidateBox(type, query, candidates, onSelect) {
    const parentContainer = document.getElementById(`section-${type}`);
    clearCandidateBox(type);

    const box = document.createElement('div');
    box.id = `${type}-candidates-box`;
    box.className = 'bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-lg p-4 shadow-sm space-y-3';
    
    box.innerHTML = `
        <div class="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <i data-lucide="help-circle" class="w-4 h-4"></i>
            <span>Multiple matching players found for "${query}". Please select a player below:</span>
        </div>
        <div class="flex flex-wrap gap-2 text-xs" id="${type}-candidates-buttons"></div>
    `;

    const searchBox = parentContainer.querySelector('div');
    searchBox.after(box);

    const btnContainer = box.querySelector(`#${type}-candidates-buttons`);

    candidates.forEach((cand, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-brand-500 hover:text-white dark:hover:bg-sky-500 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium transition-colors cursor-pointer';
        btn.textContent = `${idx + 1}. ${cand}`;
        btn.onclick = () => {
            clearCandidateBox(type);
            onSelect(cand);
        };
        btnContainer.appendChild(btn);
    });

    lucide.createIcons();
}

function clearCandidateBox(type) {
    const old = document.getElementById(`${type}-candidates-box`);
    if (old) old.remove();
}

// 3. TEAM HANDLERS
async function loadDefaultTeam(teamOrAlias) {
    const data = await apiService.getTeamAnalysis(teamOrAlias);
    if (data && !data.error) {
        updateTeamUI(data);
    } else {
        alert(data?.error || `Team ${teamOrAlias} not found`);
    }
}

function handleTeamSearch(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const input = document.getElementById('team-search-input').value.trim();
    if (input) loadDefaultTeam(input);
}

function quickSelectTeam(alias) {
    document.getElementById('team-search-input').value = alias;
    loadDefaultTeam(alias);
}

function updateTeamUI(data) {
    document.getElementById('team-display-name').textContent = data.teamName;
    document.getElementById('team-matches').textContent = data.matches;
    document.getElementById('team-wins').textContent = data.wins;
    document.getElementById('team-losses').textContent = data.losses;
    document.getElementById('team-ties').textContent = data.ties || 0;
    document.getElementById('team-winrate').textContent = `${data.winPercentage}%`;
    document.getElementById('team-runs').textContent = (data.totalRuns || 0).toLocaleString();
    document.getElementById('team-wickets').textContent = (data.totalWickets || 0).toLocaleString();
    document.getElementById('team-avgruns').textContent = data.avgRunsPerMatch;

    const tbody = document.getElementById('team-table-body');
    tbody.innerHTML = '';
    const perf = data.seasonPerformance || [];
    perf.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2 px-3 font-medium">${row.season}</td>
            <td class="py-2 px-3">${row.matches}</td>
            <td class="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">${row.wins}</td>
            <td class="py-2 px-3 text-rose-600 dark:text-rose-400 font-bold">${row.losses}</td>
        `;
        tbody.appendChild(tr);
    });

    const colors = getChartColors();
    const ctx = document.getElementById('team-season-chart').getContext('2d');
    if (teamChart) teamChart.destroy();

    teamChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: perf.map(s => s.season),
            datasets: [
                {
                    label: 'Wins',
                    data: perf.map(s => s.wins),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10B981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Losses',
                    data: perf.map(s => s.losses),
                    backgroundColor: 'rgba(244, 63, 94, 0.8)',
                    borderColor: '#F43F5E',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: colors.text } } },
            scales: {
                x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
                y: { ticks: { color: colors.text }, grid: { color: colors.grid } }
            }
        }
    });
}

// 4. SEASON HANDLERS
async function populateSeasonDropdown() {
    const select = document.getElementById('season-select');
    if (!select) return;
    select.innerHTML = '';
    
    let seasons = [];
    try {
        const res = await fetch(`${BACKEND_BASE_URL}/seasons`);
        seasons = await res.json();
    } catch (err) {
        console.error("Failed to fetch seasons list:", err);
    }

    if (!seasons || seasons.length === 0) {
        for (let yr = 2026; yr >= 2008; yr--) {
            seasons.push(yr);
        }
    }

    seasons.forEach(yr => {
        const opt = document.createElement('option');
        opt.value = yr;
        opt.textContent = `IPL ${yr} Season`;
        select.appendChild(opt);
    });
}

async function loadDefaultSeason(year) {
    const data = await apiService.getSeasonAnalysis(year);
    if (data && !data.error) {
        updateSeasonUI(data);
    } else {
        alert(data?.error || `Season ${year} not found`);
    }
}

function handleSeasonSearch(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const yr = document.getElementById('season-select').value;
    loadDefaultSeason(yr);
}

function updateSeasonUI(data) {
    document.getElementById('season-display-title').textContent = `IPL ${data.season} Season Overview`;
    document.getElementById('season-orange-cap').textContent = data.orangeCap;
    document.getElementById('season-purple-cap').textContent = data.purpleCap;
    document.getElementById('season-highest-ind').textContent = data.highestIndividualScore;
    document.getElementById('season-matches').textContent = data.matches;
    document.getElementById('season-highest-team').textContent = data.highestTeamScore;
    document.getElementById('season-lowest-team').textContent = data.lowestTeamScore;

    const tbody = document.getElementById('season-standings-body');
    tbody.innerHTML = '';
    const standings = data.standings || [];
    standings.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2.5 px-4 font-bold text-slate-500">#${row.rank}</td>
            <td class="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">${row.team}</td>
            <td class="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-bold font-mono">${row.wins} Wins</td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. VENUE HANDLERS
async function loadDefaultVenue(name) {
    const data = await apiService.getVenueAnalysis(name);
    if (data && !data.error) {
        updateVenueUI(data);
    } else {
        alert(data?.error || `Venue ${name} not found`);
    }
}

function handleVenueSearch(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const input = document.getElementById('venue-search-input').value.trim();
    if (input) loadDefaultVenue(input);
}

function updateVenueUI(data) {
    document.getElementById('venue-display-name').textContent = data.venueName;
    document.getElementById('venue-matches').textContent = data.matches;
    document.getElementById('venue-avg-score').textContent = data.averageScore;
    document.getElementById('venue-highest').textContent = data.highestScore;
    document.getElementById('venue-lowest').textContent = data.lowestScore;
    document.getElementById('venue-bat-first').textContent = `${data.winsBattingFirst} Matches`;
    document.getElementById('venue-chasing').textContent = `${data.winsChasing} Matches`;

    const ctx = document.getElementById('venue-chart').getContext('2d');
    if (venueChart) venueChart.destroy();

    venueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Batting First', 'Chasing'],
            datasets: [{
                data: [data.winsBattingFirst, data.winsChasing],
                backgroundColor: ['#004ba0', '#10B981'],
                borderColor: isDarkModeActive() ? '#0f172a' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// 6. COMPARISON HANDLERS
async function loadDefaultComparison(p1, p2) {
    const data = await apiService.getPlayerComparison(p1, p2);
    if (data) {
        updateComparisonUI(data);
    }
}

function handleComparison(e) {
    e.preventDefault();
    closeAllAutocompletePanels();
    const p1 = document.getElementById('comp-p1-input').value.trim() || 'Virat Kohli';
    const p2 = document.getElementById('comp-p2-input').value.trim() || 'Rohit Sharma';
    loadDefaultComparison(p1, p2);
}

function updateComparisonUI(data) {
    const { p1, p2 } = data;
    if (!p1 || !p2) return;

    document.getElementById('comp-head-p1').textContent = p1.name;
    document.getElementById('comp-head-p2').textContent = p2.name;
    document.getElementById('comp-bow-head-p1').textContent = p1.name;
    document.getElementById('comp-bow-head-p2').textContent = p2.name;

    const b1 = p1.bat || {};
    const b2 = p2.bat || {};

    document.getElementById('comp-bat-runs-1').textContent = b1.runs || 0;
    document.getElementById('comp-bat-runs-2').textContent = b2.runs || 0;
    document.getElementById('comp-bat-balls-1').textContent = b1.balls || 0;
    document.getElementById('comp-bat-balls-2').textContent = b2.balls || 0;
    document.getElementById('comp-bat-sr-1').textContent = b1.strikeRate || 0;
    document.getElementById('comp-bat-sr-2').textContent = b2.strikeRate || 0;
    document.getElementById('comp-bat-avg-1').textContent = b1.average || 0;
    document.getElementById('comp-bat-avg-2').textContent = b2.average || 0;
    document.getElementById('comp-bat-boundaries-1').textContent = `${b1.fours || 0} / ${b1.sixes || 0}`;
    document.getElementById('comp-bat-boundaries-2').textContent = `${b2.fours || 0} / ${b2.sixes || 0}`;
    document.getElementById('comp-bat-fh-1').textContent = b1.fiftyHundred || `${b1.fifties || 0} / ${b1.hundreds || 0}`;
    document.getElementById('comp-bat-fh-2').textContent = b2.fiftyHundred || `${b2.fifties || 0} / ${b2.hundreds || 0}`;

    const bw1 = p1.bow || {};
    const bw2 = p2.bow || {};

    document.getElementById('comp-bow-balls-1').textContent = bw1.balls || 0;
    document.getElementById('comp-bow-balls-2').textContent = bw2.balls || 0;
    document.getElementById('comp-bow-runs-1').textContent = bw1.runsConceded || 0;
    document.getElementById('comp-bow-runs-2').textContent = bw2.runsConceded || 0;
    document.getElementById('comp-bow-wickets-1').textContent = bw1.wickets || 0;
    document.getElementById('comp-bow-wickets-2').textContent = bw2.wickets || 0;
    document.getElementById('comp-bow-eco-1').textContent = bw1.economy || 0;
    document.getElementById('comp-bow-eco-2').textContent = bw2.economy || 0;
    document.getElementById('comp-bow-avg-1').textContent = bw1.bowlingAvg || 0;
    document.getElementById('comp-bow-avg-2').textContent = bw2.bowlingAvg || 0;
    document.getElementById('comp-bow-fifers-1').textContent = bw1.fifers !== undefined ? bw1.fifers : 0;
    document.getElementById('comp-bow-fifers-2').textContent = bw2.fifers !== undefined ? bw2.fifers : 0;
}
