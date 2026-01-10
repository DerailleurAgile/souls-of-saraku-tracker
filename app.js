// Global state
let questData = null;
let currentMonth = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const content = document.getElementById('content');
const statsContainer = document.getElementById('statsContainer');
const timeline = document.getElementById('timeline');
const errorContainer = document.getElementById('errorContainer');
const monthSelector = document.getElementById('monthSelector');

// Auto-load quest-data.json on page load
window.addEventListener('load', () => {
    loadQuestDataFromFile('quest-data.json');
});

// Manual file upload
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            questData = data;
            renderQuestData(data);
            errorContainer.innerHTML = '';
            uploadSection.classList.add('hidden');
        } catch (err) {
            showError('Invalid JSON file. Please check your file format.');
        }
    };
    reader.readAsText(file);
});

async function loadQuestDataFromFile(filename) {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`./${filename}?t=${timestamp}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        questData = data;
        renderQuestData(data);
        uploadSection.classList.add('hidden');
        errorContainer.innerHTML = '<div style="background: rgba(34, 197, 94, 0.2); border: 2px solid #22c55e; color: #86efac; padding: 15px; border-radius: 8px; margin-bottom: 20px;">✓ Quest data loaded successfully!</div>';
        
        setTimeout(() => {
            errorContainer.innerHTML = '';
        }, 3000);
    } catch (err) {
        console.error('Auto-load failed:', err);
        errorContainer.innerHTML = `<div style="background: rgba(251, 191, 36, 0.2); border: 2px solid #fbbf24; color: #fde68a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">⚠️ Could not auto-load quest-data.json. Please upload manually or check console for details.<br><small>Error: ${err.message}</small></div>`;
    }
}

function showError(message) {
    errorContainer.innerHTML = `<div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; color: #fca5a5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">${message}</div>`;
    content.classList.add('hidden');
}

function renderQuestData(data) {
    const char = data.character;
    const quest = data.quest_progress;

    // Render stats
    renderStats(char, quest);
    
    // Get current month from current_date
    const currentDate = new Date(quest.current_date);
    currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Render month selector
    renderMonthSelector(quest.completed_days);
    
    // Render timeline for current month
    renderTimeline(quest.completed_days, quest.current_date, currentMonth);

    content.classList.remove('hidden');
}

function renderStats(char, quest) {
    const hpPercent = (char.stats.hp / char.stats.max_hp) * 100;
    const modifiers = quest.active_modifiers || {};
    
    let modifierBadges = '';
    for (const [key, value] of Object.entries(modifiers)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        modifierBadges += `<div class="modifier-badge">✨ ${label}: +${value}</div>`;
    }

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Character</div>
            <div class="stat-value">${char.name}</div>
            <div class="stat-label" style="margin-top: 15px;">Class</div>
            <div class="stat-value" style="font-size: 1.5em;">${char.class}</div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Health Points</div>
            <div class="stat-value">${char.stats.hp} / ${char.stats.max_hp}</div>
            <div class="hp-bar">
                <div class="hp-fill" style="width: ${hpPercent}%;"></div>
            </div>
        </div>

        <div class="stat-card">
            <div class="stat-label">Spell Points</div>
            <div class="stat-value">${char.stats.spell_points}</div>
            ${modifierBadges}
        </div>

        <div class="stat-card">
            <div class="stat-label">Quest Progress</div>
            <div class="stat-value">Day ${quest.completed_days.length}</div>
            <div class="stat-label" style="margin-top: 15px;">Events Completed</div>
            <div class="stat-value" style="font-size: 1.5em;">${quest.completed_days.length}</div>
        </div>
    `;
}

function renderMonthSelector(completedDays) {
    // Get all unique months from the data
    const monthsSet = new Set();
    completedDays.forEach(day => {
        const [year, month] = day.date.split(/[-\/]/);
        monthsSet.add(`${year}-${month}`);
    });
    
    const months = Array.from(monthsSet).sort();
    
    // Generate all months in 2026
    const allMonths = [];
    for (let i = 1; i <= 12; i++) {
        allMonths.push(`2026-${String(i).padStart(2, '0')}`);
    }
    
    monthSelector.innerHTML = allMonths.map(monthKey => {
        const hasEvents = months.includes(monthKey);
        const isActive = monthKey === currentMonth;
        const monthName = getMonthName(monthKey);
        
        return `
            <button 
                class="month-btn ${isActive ? 'active' : ''} ${!hasEvents ? 'disabled' : ''}"
                data-month="${monthKey}"
                ${!hasEvents ? 'disabled' : ''}
            >
                ${monthName}
            </button>
        `;
    }).join('');
    
    // Add click handlers
    document.querySelectorAll('.month-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedMonth = btn.dataset.month;
            currentMonth = selectedMonth;
            
            // Update active state
            document.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Re-render timeline
            renderTimeline(questData.quest_progress.completed_days, questData.quest_progress.current_date, selectedMonth);
        });
    });
}

function renderTimeline(completedDays, currentDate, monthFilter) {
    // Filter events by selected month
    const filteredDays = completedDays.filter(day => {
        const [year, month] = day.date.split(/[-\/]/);
        return `${year}-${month}` === monthFilter;
    });
    
    if (filteredDays.length === 0) {
        timeline.innerHTML = '<div class="no-events-message">No events recorded for this month</div>';
        return;
    }
    
    timeline.innerHTML = filteredDays.map(day => {
        const isToday = day.date === currentDate;
        const formattedDate = formatDate(day.date);
        const outcomeHtml = formatOutcome(day.outcome);
        
        return `
            <div class="timeline-item ${isToday ? 'current-day' : ''}">
                <div class="date">${formattedDate}${isToday ? ' - TODAY' : ''}</div>
                <div class="event">${day.event}</div>
                <div class="outcome">${outcomeHtml}</div>
            </div>
        `;
    }).join('');
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split(/[-\/]/);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatOutcome(outcome) {
    return outcome.replace(
        /(Success|Victory|Result \d+|Partial Success)/gi,
        '<span class="success">$1</span>'
    );
}

function getMonthName(monthKey) {
    const [year, month] = monthKey.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long' });
}