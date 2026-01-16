// Tick Board application

// Status icons matching tk view
const STATUS_ICONS = {
    open: '\u25CB',       // ○
    in_progress: '\u25CF', // ●
    closed: '\u2713',      // ✓
    awaiting: '\u25D0',    // ◐
    blocked: '\u2298'      // ⊘
};

// Get status icon and class for a tick
function getStatusInfo(tick) {
    // Awaiting human takes priority
    if (tick.awaiting || tick.manual) {
        return { icon: STATUS_ICONS.awaiting, class: 'status-awaiting' };
    }
    // Blocked status (open tick with isBlocked flag)
    if (tick.status === 'open' && tick.isBlocked) {
        return { icon: STATUS_ICONS.blocked, class: 'status-blocked' };
    }
    // Normal status
    return {
        icon: STATUS_ICONS[tick.status] || tick.status,
        class: `status-${tick.status}`
    };
}

// Format awaiting type for display
function formatAwaiting(awaiting) {
    if (!awaiting) return null;
    const labels = {
        work: 'Work',
        approval: 'Approval',
        input: 'Input',
        review: 'Review',
        content: 'Content',
        escalation: 'Escalation',
        checkpoint: 'Checkpoint'
    };
    return labels[awaiting] || awaiting;
}

// Format requires type for display
function formatRequires(requires) {
    if (!requires) return null;
    const labels = {
        approval: 'Needs Approval',
        review: 'Needs Review',
        content: 'Needs Content'
    };
    return labels[requires] || requires;
}

// Create a tick card element
function createTickCard(tick) {
    const card = document.createElement('div');
    card.className = 'tick-card';
    card.dataset.tickId = tick.id;

    // Get status info
    const statusInfo = getStatusInfo(tick);

    // Determine awaiting display (from awaiting field or legacy manual)
    const awaitingType = tick.awaiting || (tick.manual ? 'work' : null);

    // Build card HTML
    card.innerHTML = `
        <div class="tick-card-header">
            <span class="tick-card-id type-${tick.type}">${tick.id}</span>
            <span class="tick-card-status ${statusInfo.class}">${statusInfo.icon}</span>
        </div>
        <div class="tick-card-title" title="${escapeHtml(tick.title)}">${escapeHtml(tick.title)}</div>
        <div class="tick-card-footer">
            <span class="tick-card-priority priority-${tick.priority}">P${tick.priority}</span>
            ${awaitingType ? `<span class="tick-card-badge badge-awaiting">${formatAwaiting(awaitingType)}</span>` : ''}
            ${tick.requires ? `<span class="tick-card-badge badge-requires">${formatRequires(tick.requires)}</span>` : ''}
            ${tick.isBlocked ? '<span class="tick-card-badge badge-blocked">Blocked</span>' : ''}
        </div>
    `;

    // Make card clickable (will open detail panel in future task)
    card.addEventListener('click', () => {
        openTickDetail(tick.id);
    });

    return card;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Open tick detail panel (placeholder for future task)
function openTickDetail(tickId) {
    console.log('Open detail for tick:', tickId);
    // Future task will implement detail panel
}

// Render ticks into columns
function renderTicks(ticks) {
    // Get column content areas
    const columns = {
        backlog: document.querySelector('[data-column="backlog"] .column-content'),
        ready: document.querySelector('[data-column="ready"] .column-content'),
        review: document.querySelector('[data-column="review"] .column-content'),
        input: document.querySelector('[data-column="input"] .column-content'),
        rejected: document.querySelector('[data-column="rejected"] .column-content'),
        done: document.querySelector('[data-column="done"] .column-content')
    };

    // Clear existing content
    Object.values(columns).forEach(col => {
        if (col) col.innerHTML = '';
    });

    // Count ticks per column
    const counts = {
        backlog: 0,
        ready: 0,
        review: 0,
        input: 0,
        rejected: 0,
        done: 0
    };

    // Sort and render ticks into their columns
    ticks.forEach(tick => {
        const column = columns[tick.column];
        if (column) {
            column.appendChild(createTickCard(tick));
            counts[tick.column]++;
        }
    });

    // Update count badges and show empty states
    Object.entries(columns).forEach(([colName, colEl]) => {
        if (!colEl) return;

        // Update count badge
        const badge = colEl.parentElement.querySelector('.count-badge');
        if (badge) {
            badge.textContent = counts[colName];
        }

        // Show empty state if no ticks
        if (counts[colName] === 0) {
            const emptyText = {
                backlog: 'No items in backlog',
                ready: 'No items ready',
                review: 'No items awaiting review',
                input: 'No items need input',
                rejected: 'No rejected items',
                done: 'No completed items'
            };
            colEl.innerHTML = `<p class="empty-state">${emptyText[colName]}</p>`;
        }
    });
}

// Fetch ticks from API
async function fetchTicks() {
    try {
        const response = await fetch('/api/ticks');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return data.ticks || [];
    } catch (error) {
        console.error('Failed to fetch ticks:', error);
        return [];
    }
}

// Initialize the board
async function initBoard() {
    const ticks = await fetchTicks();
    renderTicks(ticks);
}

// Set up SSE for live updates
function setupLiveUpdates() {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
        // Refresh the board on any update
        initBoard();
    };

    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Reconnect after a delay
        eventSource.close();
        setTimeout(setupLiveUpdates, 5000);
    };
}

// Main entry point
document.addEventListener('DOMContentLoaded', function() {
    console.log('Tick Board initialized');
    initBoard();

    // Try to set up live updates (will fail gracefully if endpoint not implemented)
    try {
        setupLiveUpdates();
    } catch (e) {
        console.log('Live updates not available');
    }
});
