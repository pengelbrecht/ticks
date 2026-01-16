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

    // Check if tick has rejected verdict
    const isRejected = tick.verdict === 'rejected';

    // Build card HTML
    card.innerHTML = `
        <div class="tick-card-header">
            <span class="tick-card-id type-${tick.type}">${tick.id}</span>
            <span class="tick-card-status ${statusInfo.class}">${statusInfo.icon}</span>
        </div>
        <div class="tick-card-title" title="${escapeHtml(tick.title)}">${escapeHtml(tick.title)}</div>
        <div class="tick-card-footer">
            <span class="tick-card-priority priority-${tick.priority}">P${tick.priority}</span>
            ${isRejected ? '<span class="tick-card-badge badge-rejected">Rejected</span>' : ''}
            ${awaitingType ? `<span class="tick-card-badge badge-awaiting">${formatAwaiting(awaitingType)}</span>` : ''}
            ${tick.requires ? `<span class="tick-card-badge badge-requires">${formatRequires(tick.requires)}</span>` : ''}
            ${tick.isBlocked ? '<span class="tick-card-badge badge-blocked">Blocked</span>' : ''}
        </div>
    `;

    // Add visual indicator for rejected state
    if (isRejected) {
        card.classList.add('tick-card-rejected');
    }

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

// Format priority for display (P0-P4)
function formatPriority(priority) {
    const labels = ['Critical', 'High', 'Medium', 'Low', 'Backlog'];
    return `P${priority} (${labels[priority] || 'Unknown'})`;
}

// Format type for display
function formatType(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format verdict for display
function formatVerdict(verdict) {
    if (!verdict) return null;
    const labels = {
        approved: 'Approved',
        rejected: 'Rejected'
    };
    return labels[verdict] || verdict;
}

// Open tick detail panel
async function openTickDetail(tickId) {
    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-overlay');

    // Show panel with loading state
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');

    try {
        // Fetch full tick details
        const response = await fetch(`/api/ticks/${tickId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const tick = await response.json();

        // Populate the panel
        populateDetailPanel(tick);
    } catch (error) {
        console.error('Failed to fetch tick details:', error);
        closeTickDetail();
    }
}

// Close tick detail panel
function closeTickDetail() {
    const panel = document.getElementById('detail-panel');
    const overlay = document.getElementById('detail-overlay');
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
}

// Handle escape key to close panel
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTickDetail();
    }
});

// Populate detail panel with tick data
function populateDetailPanel(tick) {
    // Header: ID badge with type color
    const idEl = document.getElementById('detail-id');
    idEl.textContent = tick.id;
    idEl.className = `detail-id type-${tick.type}`;

    // Header: Status icon
    const statusInfo = getStatusInfo(tick);
    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = statusInfo.icon;
    statusEl.className = `detail-status ${statusInfo.class}`;

    // Title
    document.getElementById('detail-title').textContent = tick.title;

    // Core fields
    document.getElementById('detail-type').textContent = formatType(tick.type);
    document.getElementById('detail-priority').textContent = formatPriority(tick.priority);
    document.getElementById('detail-owner').textContent = tick.owner;
    document.getElementById('detail-created').textContent = formatDate(tick.created_at);

    // Parent (optional)
    const parentField = document.getElementById('detail-parent-field');
    if (tick.parent) {
        document.getElementById('detail-parent').textContent = tick.parent;
        parentField.style.display = '';
    } else {
        parentField.style.display = 'none';
    }

    // Labels (optional)
    const labelsField = document.getElementById('detail-labels-field');
    if (tick.labels && tick.labels.length > 0) {
        document.getElementById('detail-labels').textContent = tick.labels.join(', ');
        labelsField.style.display = '';
    } else {
        labelsField.style.display = 'none';
    }

    // Description section
    const descSection = document.getElementById('detail-description-section');
    if (tick.description) {
        document.getElementById('detail-description').textContent = tick.description;
        descSection.style.display = '';
    } else {
        descSection.style.display = 'none';
    }

    // Acceptance Criteria section
    const acSection = document.getElementById('detail-ac-section');
    if (tick.acceptance_criteria) {
        document.getElementById('detail-ac').textContent = tick.acceptance_criteria;
        acSection.style.display = '';
    } else {
        acSection.style.display = 'none';
    }

    // Workflow section (requires, awaiting, verdict)
    const workflowSection = document.getElementById('detail-workflow-section');
    const workflowEl = document.getElementById('detail-workflow');
    workflowEl.innerHTML = '';

    const hasWorkflow = tick.requires || tick.awaiting || tick.manual || tick.verdict || tick.isBlocked;
    if (hasWorkflow) {
        // Requires badge
        if (tick.requires) {
            const badge = document.createElement('span');
            badge.className = 'workflow-badge badge-requires';
            badge.textContent = `Requires: ${formatRequires(tick.requires)}`;
            workflowEl.appendChild(badge);
        }

        // Awaiting badge
        const awaitingType = tick.awaiting || (tick.manual ? 'work' : null);
        if (awaitingType) {
            const badge = document.createElement('span');
            badge.className = 'workflow-badge badge-awaiting';
            badge.textContent = `Awaiting: ${formatAwaiting(awaitingType)}`;
            workflowEl.appendChild(badge);
        }

        // Verdict badge
        if (tick.verdict) {
            const badge = document.createElement('span');
            badge.className = `workflow-badge badge-verdict-${tick.verdict}`;
            badge.textContent = `Verdict: ${formatVerdict(tick.verdict)}`;
            workflowEl.appendChild(badge);
        }

        // Blocked badge
        if (tick.isBlocked) {
            const badge = document.createElement('span');
            badge.className = 'workflow-badge badge-blocked';
            badge.textContent = 'Blocked';
            workflowEl.appendChild(badge);
        }

        workflowSection.style.display = '';
    } else {
        workflowSection.style.display = 'none';
    }

    // Blockers section
    const blockersSection = document.getElementById('detail-blockers-section');
    const blockersEl = document.getElementById('detail-blockers');
    blockersEl.innerHTML = '';

    if (tick.blockerDetails && tick.blockerDetails.length > 0) {
        tick.blockerDetails.forEach(blocker => {
            const li = document.createElement('li');
            li.className = 'blocker-item';

            const statusIcon = blocker.status === 'closed' ? STATUS_ICONS.closed : STATUS_ICONS.open;
            const statusClass = blocker.status === 'closed' ? 'status-closed' : 'status-open';

            li.innerHTML = `
                <span class="blocker-id">${escapeHtml(blocker.id)}</span>
                <span class="blocker-title">${escapeHtml(blocker.title)}</span>
                <span class="blocker-status ${statusClass}">${statusIcon}</span>
            `;
            blockersEl.appendChild(li);
        });
        blockersSection.style.display = '';
    } else {
        blockersSection.style.display = 'none';
    }

    // Notes section
    const notesSection = document.getElementById('detail-notes-section');
    const notesEl = document.getElementById('detail-notes');
    notesEl.innerHTML = '';

    if (tick.notesList && tick.notesList.length > 0) {
        tick.notesList.forEach(note => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item';

            let metaHtml = '';
            if (note.timestamp || note.author) {
                metaHtml = '<div class="note-meta">';
                if (note.timestamp) {
                    metaHtml += `<span class="note-timestamp">${escapeHtml(note.timestamp)}</span>`;
                }
                if (note.author) {
                    metaHtml += `<span class="note-author">${escapeHtml(note.author)}</span>`;
                }
                metaHtml += '</div>';
            }

            noteDiv.innerHTML = `
                ${metaHtml}
                <div class="note-text">${escapeHtml(note.text)}</div>
            `;
            notesEl.appendChild(noteDiv);
        });
        notesSection.style.display = '';
    } else {
        notesSection.style.display = 'none';
    }

    // Closed section
    const closedSection = document.getElementById('detail-closed-section');
    if (tick.status === 'closed' && tick.closed_at) {
        document.getElementById('detail-closed-at').textContent = formatDate(tick.closed_at);

        const closedReasonField = document.getElementById('detail-closed-reason-field');
        if (tick.closed_reason) {
            document.getElementById('detail-closed-reason').textContent = tick.closed_reason;
            closedReasonField.style.display = '';
        } else {
            closedReasonField.style.display = 'none';
        }

        closedSection.style.display = '';
    } else {
        closedSection.style.display = 'none';
    }
}

// Render ticks into columns
function renderTicks(ticks) {
    // Get column content areas
    const columns = {
        backlog: document.querySelector('[data-column="backlog"] .column-content'),
        ready: document.querySelector('[data-column="ready"] .column-content'),
        review: document.querySelector('[data-column="review"] .column-content'),
        input: document.querySelector('[data-column="input"] .column-content'),
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
