// Tick Board application

// Currently open tick ID (for actions)
let currentTickId = null;

// Filter state
let selectedEpicId = ''; // '' = all, 'orphaned' = no parent, or epic ID
let searchTerm = ''; // Search filter for ID/title
let cachedTicks = []; // Cached ticks for filtering
let boardInfo = null; // Cached board info (repo name, epics)

// Status icons matching tk view
const STATUS_ICONS = {
    open: '\u25CB',       // ○ (empty circle)
    in_progress: '\u25CF', // ● (filled circle) - will be animated via CSS
    closed: '\u2713',      // ✓ (checkmark)
    awaiting: '\uD83D\uDC64', // 👤 (human silhouette)
    blocked: '\u2298'      // ⊘ (circle with slash)
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

    // Only show requires badge for open ticks (closed ticks have completed their workflow)
    const showRequires = tick.requires && tick.status !== 'closed';

    // Build blockers display (show IDs of blocking ticks)
    let blockersHtml = '';
    if (tick.isBlocked && tick.blocked_by && tick.blocked_by.length > 0) {
        const blockerIds = tick.blocked_by.slice(0, 3).map(id => escapeHtml(id)).join(', ');
        const moreCount = tick.blocked_by.length > 3 ? ` +${tick.blocked_by.length - 3}` : '';
        blockersHtml = `<span class="tick-card-badge badge-blocked" title="Blocked by: ${tick.blocked_by.join(', ')}">⊘ ${blockerIds}${moreCount}</span>`;
    }

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
            ${showRequires ? `<span class="tick-card-badge badge-requires">${formatRequires(tick.requires)}</span>` : ''}
            ${blockersHtml}
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

    // Store current tick ID for actions
    currentTickId = tickId;

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
    currentTickId = null;
}

// Handle escape key to close panel/modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close modals first if open (in order of z-index)
        const createModal = document.getElementById('create-modal');
        if (!createModal.classList.contains('hidden')) {
            closeCreateModal();
            return;
        }
        const closeModal = document.getElementById('close-modal');
        if (!closeModal.classList.contains('hidden')) {
            closeCloseModal();
            return;
        }
        const rejectModal = document.getElementById('reject-modal');
        if (!rejectModal.classList.contains('hidden')) {
            closeRejectModal();
            return;
        }
        closeTickDetail();
    }
});

// Check if a tick can be edited (not closed, not in_progress)
function canEditTick(tick) {
    return tick.status !== 'closed' && tick.status !== 'in_progress';
}

// Check if a tick can be closed from UI (not closed, not in_progress, no requires gate)
function canCloseTick(tick) {
    return tick.status !== 'closed' &&
           tick.status !== 'in_progress' &&
           (!tick.requires || tick.requires === '');
}

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

    // Determine if editable
    const isEditable = canEditTick(tick);

    // Core fields - Type
    const typeValue = document.getElementById('detail-type');
    const typeEdit = document.getElementById('detail-type-edit');
    typeValue.textContent = formatType(tick.type);
    if (isEditable) {
        typeValue.classList.add('hidden');
        typeEdit.classList.remove('hidden');
        typeEdit.value = tick.type;
    } else {
        typeValue.classList.remove('hidden');
        typeEdit.classList.add('hidden');
    }

    // Core fields - Priority
    const priorityValue = document.getElementById('detail-priority');
    const priorityEdit = document.getElementById('detail-priority-edit');
    priorityValue.textContent = formatPriority(tick.priority);
    if (isEditable) {
        priorityValue.classList.add('hidden');
        priorityEdit.classList.remove('hidden');
        priorityEdit.value = tick.priority;
    } else {
        priorityValue.classList.remove('hidden');
        priorityEdit.classList.add('hidden');
    }

    document.getElementById('detail-owner').textContent = tick.owner;
    document.getElementById('detail-created').textContent = formatDate(tick.created_at);

    // Parent field - always show (editable when allowed)
    const parentField = document.getElementById('detail-parent-field');
    const parentValue = document.getElementById('detail-parent');
    const parentEdit = document.getElementById('detail-parent-edit');
    parentValue.textContent = tick.parent || 'None';
    parentField.style.display = '';
    if (isEditable) {
        parentValue.classList.add('hidden');
        parentEdit.classList.remove('hidden');
        // Populate parent dropdown with epics
        populateParentEditDropdown(tick.parent);
    } else {
        parentValue.classList.remove('hidden');
        parentEdit.classList.add('hidden');
    }

    // Requires/Workflow field - always show (editable when allowed)
    const requiresField = document.getElementById('detail-requires-field');
    const requiresValue = document.getElementById('detail-requires');
    const requiresEdit = document.getElementById('detail-requires-edit');
    requiresValue.textContent = tick.requires ? formatRequires(tick.requires) : 'None';
    requiresField.style.display = '';
    if (isEditable) {
        requiresValue.classList.add('hidden');
        requiresEdit.classList.remove('hidden');
        requiresEdit.value = tick.requires || '';
    } else {
        requiresValue.classList.remove('hidden');
        requiresEdit.classList.add('hidden');
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

    // Actions section (show for ticks awaiting human action)
    const actionsSection = document.getElementById('detail-actions-section');
    const isAwaitingHuman = tick.awaiting || tick.manual;
    if (isAwaitingHuman && tick.status !== 'closed') {
        actionsSection.style.display = '';
    } else {
        actionsSection.style.display = 'none';
    }

    // Close tick section (show for closable ticks - not awaiting, not in_progress, no requires)
    const closeSection = document.getElementById('detail-close-section');
    if (canCloseTick(tick) && !isAwaitingHuman) {
        closeSection.style.display = '';
    } else {
        closeSection.style.display = 'none';
    }
}

// Populate the parent edit dropdown with available epics
function populateParentEditDropdown(currentParent) {
    const parentEdit = document.getElementById('detail-parent-edit');
    parentEdit.innerHTML = '<option value="">None</option>';

    // Use cached epics from boardInfo
    if (boardInfo && boardInfo.epics) {
        boardInfo.epics.forEach(epic => {
            const option = document.createElement('option');
            option.value = epic.id;
            option.textContent = `${epic.id}: ${epic.title}`;
            parentEdit.appendChild(option);
        });
    }

    // Set current value
    parentEdit.value = currentParent || '';
}

// Render ticks into columns
function renderTicks(ticks) {
    // Update cache for filter changes
    cachedTicks = ticks;

    // Apply filters (epic then search)
    let filteredTicks = filterTicksByEpic(ticks);
    filteredTicks = filterTicksBySearch(filteredTicks);

    // Get column content areas
    const columns = {
        blocked: document.querySelector('[data-column="blocked"] .column-content'),
        ready: document.querySelector('[data-column="ready"] .column-content'),
        agent: document.querySelector('[data-column="agent"] .column-content'),
        human: document.querySelector('[data-column="human"] .column-content'),
        done: document.querySelector('[data-column="done"] .column-content')
    };

    // Clear existing content
    Object.values(columns).forEach(col => {
        if (col) col.innerHTML = '';
    });

    // Count ticks per column
    const counts = {
        blocked: 0,
        ready: 0,
        agent: 0,
        human: 0,
        done: 0
    };

    // Sort ticks by priority (P0 first, P4 last) - same as tk next logic
    const sortedTicks = [...filteredTicks].sort((a, b) => a.priority - b.priority);

    // Render ticks into their columns
    sortedTicks.forEach(tick => {
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
                blocked: 'No blocked items',
                ready: 'No items ready',
                agent: 'No items in progress',
                human: 'No items awaiting human',
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

// Fetch board info (repo name, epics) from API
async function fetchInfo() {
    try {
        const response = await fetch('/api/info');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch board info:', error);
        return { repoName: '', epics: [] };
    }
}

// Populate the epic filter dropdown
function populateEpicFilter(epics, ticks) {
    const select = document.getElementById('epic-filter');

    // Keep "All Ticks" option
    select.innerHTML = '<option value="">All Ticks</option>';

    // Check for orphaned ticks (non-epics without a parent)
    const hasOrphaned = ticks.some(t => t.type !== 'epic' && !t.parent);
    if (hasOrphaned) {
        const orphanedOption = document.createElement('option');
        orphanedOption.value = 'orphaned';
        orphanedOption.textContent = 'No Epic (Orphaned)';
        select.appendChild(orphanedOption);
    }

    // Add epics to dropdown
    epics.forEach(epic => {
        const option = document.createElement('option');
        option.value = epic.id;
        option.textContent = `${epic.id}: ${epic.title}`;
        select.appendChild(option);
    });

    // Restore selected value
    if (selectedEpicId) {
        select.value = selectedEpicId;
    }
}

// Handle epic filter change
function handleEpicFilterChange() {
    const select = document.getElementById('epic-filter');
    selectedEpicId = select.value;

    // Update URL param
    const url = new URL(window.location);
    if (selectedEpicId) {
        url.searchParams.set('epic', selectedEpicId);
    } else {
        url.searchParams.delete('epic');
    }
    window.history.replaceState({}, '', url);

    // Re-render with cached ticks
    renderTicks(cachedTicks);
}

// Handle search input
function handleSearchInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    searchTerm = input.value.trim().toLowerCase();

    // Show/hide clear button
    if (input.value) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }

    // Re-render with cached ticks
    renderTicks(cachedTicks);
}

// Clear search input
function clearSearch() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('search-clear');
    input.value = '';
    searchTerm = '';
    clearBtn.classList.add('hidden');
    renderTicks(cachedTicks);
    input.focus();
}

// Filter ticks by selected epic
function filterTicksByEpic(ticks) {
    if (!selectedEpicId) {
        return ticks; // No filter, show all
    }

    if (selectedEpicId === 'orphaned') {
        // Show ticks without a parent (excluding epics themselves)
        return ticks.filter(t => t.type !== 'epic' && !t.parent);
    }

    // Show ticks with the selected epic as parent, plus the epic itself
    return ticks.filter(t => t.parent === selectedEpicId || t.id === selectedEpicId);
}

// Filter ticks by search term (ID or title)
function filterTicksBySearch(ticks) {
    if (!searchTerm) {
        return ticks; // No search, show all
    }

    return ticks.filter(t =>
        t.id.toLowerCase().includes(searchTerm) ||
        t.title.toLowerCase().includes(searchTerm)
    );
}

// Initialize the board
async function initBoard() {
    // Fetch board info
    boardInfo = await fetchInfo();

    // Set repo name in header
    const repoNameEl = document.getElementById('repo-name');
    if (boardInfo.repoName) {
        repoNameEl.textContent = boardInfo.repoName;
        repoNameEl.style.display = '';
    } else {
        repoNameEl.style.display = 'none';
    }

    // Get epic from URL param on initial load
    const urlParams = new URLSearchParams(window.location.search);
    const epicParam = urlParams.get('epic');
    if (epicParam) {
        selectedEpicId = epicParam;
    }

    // Fetch and cache ticks
    cachedTicks = await fetchTicks();

    // Populate epic filter dropdown
    populateEpicFilter(boardInfo.epics || [], cachedTicks);

    // Render filtered ticks
    renderTicks(cachedTicks);
}

// Set up SSE for live updates with FLIP animations
function setupLiveUpdates() {
    const eventSource = new EventSource('/api/events');

    eventSource.addEventListener('connected', () => {
        console.log('SSE connected');
    });

    eventSource.addEventListener('update', async (event) => {
        // Parse the event data
        const data = JSON.parse(event.data);
        console.log('SSE update:', data);

        // Animate the board update
        await animatedBoardUpdate();
    });

    eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Reconnect after a delay
        eventSource.close();
        setTimeout(setupLiveUpdates, 5000);
    };
}

// FLIP animation for smooth card movements
async function animatedBoardUpdate() {
    // FIRST: Record current positions AND columns of all cards
    const cards = document.querySelectorAll('.tick-card');
    const firstState = new Map();

    cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const column = card.closest('.kanban-column')?.dataset.column;
        firstState.set(card.dataset.tickId, {
            left: rect.left,
            top: rect.top,
            column: column
        });
    });

    // Fetch new data and update cache
    cachedTicks = await fetchTicks();

    // Also refresh board info to update epic dropdown if epics changed
    boardInfo = await fetchInfo();
    populateEpicFilter(boardInfo.epics || [], cachedTicks);

    // Re-render with filter applied
    renderTicks(cachedTicks);

    // LAST: Get new positions after DOM update
    const newCards = document.querySelectorAll('.tick-card');

    newCards.forEach(card => {
        const tickId = card.dataset.tickId;
        const first = firstState.get(tickId);
        const newColumn = card.closest('.kanban-column')?.dataset.column;

        if (first) {
            const last = card.getBoundingClientRect();
            const deltaX = first.left - last.left;
            const deltaY = first.top - last.top;
            const changedColumn = first.column !== newColumn;

            // Only animate if card actually moved position
            if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
                // INVERT: Apply inverse transform
                card.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                card.style.transition = 'none';

                // Force reflow
                card.offsetHeight;

                // PLAY: Animate to final position
                card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.transform = '';

                // Only highlight if card changed COLUMNS (not just shifted within column)
                if (changedColumn) {
                    card.classList.add('tick-card-moved');
                    setTimeout(() => card.classList.remove('tick-card-moved'), 1000);
                }
            }
        } else {
            // New card - animate in with scale
            card.style.transform = 'scale(0.8)';
            card.style.opacity = '0';
            card.style.transition = 'none';

            // Force reflow
            card.offsetHeight;

            card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';

            // Add highlight effect for new cards
            card.classList.add('tick-card-new');
            setTimeout(() => card.classList.remove('tick-card-new'), 1500);
        }
    });
}

// ========================================
// Approve/Reject Actions
// ========================================

// Approve the current tick
async function approveTick() {
    if (!currentTickId) return;

    const btn = document.getElementById('btn-approve');
    btn.disabled = true;

    try {
        const response = await fetch(`/api/ticks/${currentTickId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        showToast('Tick approved successfully', 'success');
        closeTickDetail();
        initBoard(); // Refresh the board
    } catch (error) {
        console.error('Failed to approve tick:', error);
        showToast(`Failed to approve: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
    }
}

// Open the reject modal
function openRejectModal() {
    const modal = document.getElementById('reject-modal');
    const textarea = document.getElementById('reject-feedback');
    textarea.value = '';
    modal.classList.remove('hidden');
    textarea.focus();
}

// Close the reject modal
function closeRejectModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('reject-modal');
    modal.classList.add('hidden');
}

// Submit the rejection with feedback
async function submitReject() {
    if (!currentTickId) return;

    const textarea = document.getElementById('reject-feedback');
    const feedback = textarea.value.trim();

    if (!feedback) {
        showToast('Feedback is required for rejection', 'error');
        textarea.focus();
        return;
    }

    const btn = document.querySelector('#reject-modal .action-btn-reject');
    btn.disabled = true;

    try {
        const response = await fetch(`/api/ticks/${currentTickId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        showToast('Tick rejected with feedback', 'success');
        closeRejectModal();
        closeTickDetail();
        initBoard(); // Refresh the board
    } catch (error) {
        console.error('Failed to reject tick:', error);
        showToast(`Failed to reject: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ========================================
// Update Tick Field (Inline Edit)
// ========================================

// Update a single field on the current tick
async function updateTickField(field, value) {
    if (!currentTickId) return;

    try {
        const requestBody = {};
        requestBody[field] = value;

        const response = await fetch(`/api/ticks/${currentTickId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const updatedTick = await response.json();

        // Update the detail panel with new data
        populateDetailPanel(updatedTick);

        showToast(`Updated ${field}`, 'success');
        initBoard(); // Refresh the board
    } catch (error) {
        console.error('Failed to update tick:', error);
        showToast(`Failed to update: ${error.message}`, 'error');
        // Refresh to revert UI
        openTickDetail(currentTickId);
    }
}

// ========================================
// Close Tick Modal
// ========================================

// Open the close tick modal
function openCloseModal() {
    const modal = document.getElementById('close-modal');
    const textarea = document.getElementById('close-reason');
    textarea.value = '';
    modal.classList.remove('hidden');
    textarea.focus();
}

// Close the close tick modal
function closeCloseModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('close-modal');
    modal.classList.add('hidden');
}

// Submit the close action
async function submitClose() {
    if (!currentTickId) return;

    const textarea = document.getElementById('close-reason');
    const reason = textarea.value.trim();

    const btn = document.querySelector('#close-modal .action-btn-close');
    btn.disabled = true;

    try {
        const requestBody = {};
        if (reason) {
            requestBody.reason = reason;
        }

        const response = await fetch(`/api/ticks/${currentTickId}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        showToast('Tick closed', 'success');
        closeCloseModal();
        closeTickDetail();
        initBoard(); // Refresh the board
    } catch (error) {
        console.error('Failed to close tick:', error);
        showToast(`Failed to close: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
    }
}

// ========================================
// Add Note Action
// ========================================

// Submit a note for the current tick
async function submitNote() {
    if (!currentTickId) return;

    const textarea = document.getElementById('note-input');
    const message = textarea.value.trim();

    if (!message) {
        showToast('Note cannot be empty', 'error');
        textarea.focus();
        return;
    }

    const btn = document.getElementById('btn-add-note');
    btn.disabled = true;

    try {
        const response = await fetch(`/api/ticks/${currentTickId}/note`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const updatedTick = await response.json();

        // Clear the form
        textarea.value = '';

        // Update the notes section without closing panel
        updateNotesSection(updatedTick.notesList);

        showToast('Note added', 'success');
    } catch (error) {
        console.error('Failed to add note:', error);
        showToast(`Failed to add note: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
    }
}

// Update only the notes section in the detail panel
function updateNotesSection(notesList) {
    const notesSection = document.getElementById('detail-notes-section');
    const notesEl = document.getElementById('detail-notes');
    notesEl.innerHTML = '';

    if (notesList && notesList.length > 0) {
        notesList.forEach(note => {
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
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? '✓' : '✗';
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ========================================
// Create Tick Modal
// ========================================

// Cache for epics list
let epicsList = [];

// Open the create tick modal
async function openCreateModal() {
    const modal = document.getElementById('create-modal');
    const titleInput = document.getElementById('create-title');
    const descriptionInput = document.getElementById('create-description');
    const typeSelect = document.getElementById('create-type');
    const prioritySelect = document.getElementById('create-priority');
    const parentSelect = document.getElementById('create-parent');
    const requiresSelect = document.getElementById('create-requires');

    // Reset form
    titleInput.value = '';
    descriptionInput.value = '';
    typeSelect.value = 'task';
    prioritySelect.value = '2';
    requiresSelect.value = '';

    // Populate parent epic dropdown
    await populateEpicDropdown();

    // Show modal
    modal.classList.remove('hidden');
    titleInput.focus();
}

// Populate the parent epic dropdown with available epics
async function populateEpicDropdown() {
    const parentSelect = document.getElementById('create-parent');

    // Keep the "None" option
    parentSelect.innerHTML = '<option value="">None</option>';

    try {
        // Fetch ticks and filter for open epics
        const ticks = await fetchTicks();
        epicsList = ticks.filter(t => t.type === 'epic' && t.status === 'open');

        // Add epics to dropdown
        epicsList.forEach(epic => {
            const option = document.createElement('option');
            option.value = epic.id;
            option.textContent = `${epic.id}: ${epic.title}`;
            parentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load epics:', error);
    }
}

// Close the create tick modal
function closeCreateModal(event) {
    // If called from overlay click, only close if clicking the overlay itself
    if (event && event.target !== event.currentTarget) return;

    const modal = document.getElementById('create-modal');
    modal.classList.add('hidden');
}

// Submit the create tick form
async function submitCreateTick(event) {
    if (event) event.preventDefault();

    const titleInput = document.getElementById('create-title');
    const descriptionInput = document.getElementById('create-description');
    const typeSelect = document.getElementById('create-type');
    const prioritySelect = document.getElementById('create-priority');
    const parentSelect = document.getElementById('create-parent');
    const requiresSelect = document.getElementById('create-requires');

    const title = titleInput.value.trim();
    if (!title) {
        showToast('Title is required', 'error');
        titleInput.focus();
        return;
    }

    // Build request body
    const requestBody = {
        title: title,
        type: typeSelect.value,
        priority: parseInt(prioritySelect.value, 10)
    };

    const description = descriptionInput.value.trim();
    if (description) {
        requestBody.description = description;
    }

    const parent = parentSelect.value;
    if (parent) {
        requestBody.parent = parent;
    }

    const requires = requiresSelect.value;
    if (requires) {
        requestBody.requires = requires;
    }

    // Disable submit button
    const submitBtn = document.querySelector('#create-modal .action-btn-primary');
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/ticks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP ${response.status}`);
        }

        const newTick = await response.json();
        showToast(`Tick ${newTick.id} created`, 'success');
        closeCreateModal();
        initBoard(); // Refresh the board
    } catch (error) {
        console.error('Failed to create tick:', error);
        showToast(`Failed to create tick: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
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
