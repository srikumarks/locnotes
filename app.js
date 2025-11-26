// ===== DATABASE SETUP =====
const DB_NAME = 'LocNotesDB';
const DB_VERSION = 2; // Incremented for schema changes
let db = null;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;

            // Notes store
            if (!db.objectStoreNames.contains('notes')) {
                const notesStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
                notesStore.createIndex('locationId', 'locationId', { unique: false });
                notesStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
                notesStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Locations store
            if (!db.objectStoreNames.contains('locations')) {
                const locationsStore = db.createObjectStore('locations', { keyPath: 'id', autoIncrement: true });
                locationsStore.createIndex('nickname', 'nickname', { unique: true });
            }

            // Dismissals store (track which scheduled notes have been dismissed)
            if (!db.objectStoreNames.contains('dismissals')) {
                const dismissalsStore = db.createObjectStore('dismissals', { keyPath: 'id', autoIncrement: true });
                dismissalsStore.createIndex('noteId_time', ['noteId', 'dismissedAt'], { unique: false });
            }
        };
    });
}

// ===== VIEW MANAGEMENT =====

let currentView = 'notes';
let viewHistory = ['notes'];

// Show a specific view
function showView(viewName, data = null) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show the requested view
    const viewElement = document.getElementById(`${viewName}View`);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Update bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });

    // Update header
    const backButton = document.getElementById('backButton');
    const headerTitle = document.getElementById('headerTitle');

    // Update title based on view
    const titles = {
        'notes': 'LocNotes',
        'create': 'New Note',
        'noteDetail': 'Note Details',
        'locations': 'Locations',
        'hashtagFilter': 'Tagged Notes',
        'settings': 'Settings',
        'help': 'Help'
    };

    headerTitle.textContent = titles[viewName] || 'LocNotes';

    // Show back button for non-main views
    if (viewName !== 'notes' && viewName !== 'create' && viewName !== 'locations' && viewName !== 'settings') {
        backButton.classList.add('visible');
    } else {
        backButton.classList.remove('visible');
    }

    // Update history
    if (currentView !== viewName) {
        viewHistory.push(viewName);
        currentView = viewName;

        // Update browser history
        history.pushState({ view: viewName, data }, '', `#${viewName}`);
    }

    // Handle view-specific data (even if no data, some views need initialization)
    handleViewData(viewName, data);

    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
}

// Handle view-specific data
function handleViewData(viewName, data) {
    if (viewName === 'noteDetail' && data && data.noteId) {
        displayNoteDetail(data.noteId);
    } else if (viewName === 'hashtagFilter' && data && data.hashtag) {
        displayHashtagFilter(data.hashtag);
    } else if (viewName === 'locations') {
        showManageLocations();
    }
}

// Go back to previous view
function goBack() {
    // Just use browser back - popstate will handle the view change
    history.back();
}

// Handle browser back button
window.addEventListener('popstate', (event) => {
    const targetView = event.state && event.state.view ? event.state.view : 'notes';

    // Remove duplicates from history
    if (viewHistory.length > 0 && viewHistory[viewHistory.length - 1] === targetView) {
        viewHistory.pop();
    }

    // Update current view without adding to history
    currentView = targetView;

    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show the target view
    const viewElement = document.getElementById(`${targetView}View`);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Update bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === targetView) {
            item.classList.add('active');
        }
    });

    // Update header
    const backButton = document.getElementById('backButton');
    const headerTitle = document.getElementById('headerTitle');

    const titles = {
        'notes': 'LocNotes',
        'create': 'New Note',
        'noteDetail': 'Note Details',
        'locations': 'Locations',
        'hashtagFilter': 'Tagged Notes',
        'settings': 'Settings'
    };

    headerTitle.textContent = titles[targetView] || 'LocNotes';

    // Show back button for non-main views
    if (targetView !== 'notes' && targetView !== 'create' && targetView !== 'locations' && targetView !== 'settings') {
        backButton.classList.add('visible');
    } else {
        backButton.classList.remove('visible');
    }

    // Handle view-specific data
    const viewData = event.state && event.state.data;
    handleViewData(targetView, viewData);

    // Scroll to top
    document.querySelector('.main-content').scrollTop = 0;
});

// ===== HASHTAG UTILITIES =====

// Extract hashtags from HTML content
function extractHashtags(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText;

    // Match #word or #word-with-hyphens but not purely numeric
    const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/g;
    const hashtags = new Set();

    let match;
    while ((match = hashtagRegex.exec(textContent)) !== null) {
        const tag = match[1].toLowerCase();
        // Exclude purely numeric tags (those are note references)
        if (!/^\d+$/.test(tag)) {
            hashtags.add(tag);
        }
    }

    return Array.from(hashtags);
}

// Get all unique hashtags from all notes
async function getAllHashtags() {
    const notes = await getAllNotes();
    const allTags = new Set();

    notes.forEach(note => {
        if (note.hashtags && Array.isArray(note.hashtags)) {
            note.hashtags.forEach(tag => allTags.add(tag));
        }
    });

    return Array.from(allTags).sort();
}

// ===== DATABASE OPERATIONS =====

// Add a note
async function addNote(noteData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notes'], 'readwrite');
        const store = transaction.objectStore('notes');
        const request = store.add(noteData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all notes
async function getAllNotes() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get note by ID
async function getNoteById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notes'], 'readonly');
        const store = transaction.objectStore('notes');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Add or update location
async function addLocation(locationData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['locations'], 'readwrite');
        const store = transaction.objectStore('locations');
        const request = locationData.id ? store.put(locationData) : store.add(locationData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all locations
async function getAllLocations() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['locations'], 'readonly');
        const store = transaction.objectStore('locations');
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get location by ID
async function getLocationById(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['locations'], 'readonly');
        const store = transaction.objectStore('locations');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Find location by nickname
async function getLocationByNickname(nickname) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['locations'], 'readonly');
        const store = transaction.objectStore('locations');
        const index = store.index('nickname');
        const request = index.get(nickname);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Add dismissal
async function addDismissal(noteId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dismissals'], 'readwrite');
        const store = transaction.objectStore('dismissals');
        const request = store.add({
            noteId: noteId,
            dismissedAt: new Date().toISOString()
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Check if note is dismissed (within current 5-minute window)
async function isNoteDismissed(noteId, currentTimeWindow) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['dismissals'], 'readonly');
        const store = transaction.objectStore('dismissals');
        const request = store.getAll();

        request.onsuccess = () => {
            const dismissals = request.result;
            const dismissed = dismissals.some(d =>
                d.noteId === noteId &&
                getTimeWindow(new Date(d.dismissedAt)) === currentTimeWindow
            );
            resolve(dismissed);
        };
        request.onerror = () => reject(request.error);
    });
}

// ===== GEOLOCATION =====

let currentPosition = null;

// Request geolocation permission and get current position
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                resolve(currentPosition);
            },
            (error) => reject(error),
            { enableHighAccuracy: true }
        );
    });
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Check if location matches current position (within 10m radius)
function isLocationMatch(location) {
    if (!currentPosition || !location) return false;

    const distance = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        location.latitude,
        location.longitude
    );

    return distance <= 10; // 10 meter radius
}

// Find matching location by coordinates
async function findMatchingLocation() {
    if (!currentPosition) return null;

    const locations = await getAllLocations();
    return locations.find(loc => isLocationMatch(loc));
}

// ===== TIME HANDLING =====

// Get 5-minute time window for a given date
function getTimeWindow(date) {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    const windowDate = new Date(date);
    windowDate.setMinutes(roundedMinutes, 0, 0);
    return windowDate.toISOString();
}

// Check if a scheduled time matches current time window
function isScheduledNoteActive(scheduledTime) {
    if (!scheduledTime) return false;

    const now = new Date();
    const scheduled = new Date(scheduledTime);
    const currentWindow = getTimeWindow(now);
    const scheduledWindow = getTimeWindow(scheduled);

    return currentWindow === scheduledWindow;
}

// ===== NOTE RENDERING =====

// Convert note references (#123) and hashtags (#tag-name) to clickable links
function processNoteReferences(htmlContent) {
    // First, process note references (purely numeric)
    let processed = htmlContent.replace(/#(\d+)/g, '<span class="note-reference" data-note-id="$1">#$1</span>');

    // Then, process hashtags (alphanumeric with hyphens, but not purely numeric)
    processed = processed.replace(/#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/g, (match, tag) => {
        if (/^\d+$/.test(tag)) {
            // This was already handled as a note reference
            return match;
        }
        return `<span class="hashtag" data-hashtag="${tag.toLowerCase()}">#${tag}</span>`;
    });

    return processed;
}

// Render a single note (for list view - shows preview)
function renderNote(note, isSticky = false, isDetail = false) {
    const noteDiv = document.createElement('div');
    noteDiv.className = isSticky ? 'note-card sticky-note' : 'note-card';
    noteDiv.dataset.noteId = note.id;

    const content = processNoteReferences(note.content);

    let metaInfo = [];
    if (note.locationNickname) {
        metaInfo.push(`📍 ${note.locationNickname}`);
    }
    if (note.hashtags && note.hashtags.length > 0) {
        metaInfo.push(`${note.hashtags.map(t => '#' + t).join(' ')}`);
    }
    if (note.scheduledTime) {
        metaInfo.push(`⏰ ${new Date(note.scheduledTime).toLocaleString()}`);
    }

    // For list view, show content preview; for detail view, show full content
    const contentClass = (isDetail || isSticky) ? 'note-content' : 'note-content note-content-preview';

    noteDiv.innerHTML = `
        <div class="note-header">
            <span class="note-id">#${note.id}</span>
            ${isSticky ? `<button class="dismiss-btn secondary" data-note-id="${note.id}" onclick="event.stopPropagation();"><span class="icon">✕</span><span class="button-text">Dismiss</span></button>` : ''}
        </div>
        <div class="note-meta">${metaInfo.join(' • ')}</div>
        <div class="${contentClass}">${content}</div>
        ${!isDetail ? `<div style="font-size: 0.75rem; color: var(--pico-muted-color); margin-top: 0.5rem;">Created: ${new Date(note.createdAt).toLocaleString()}</div>` : ''}
    `;

    // Add click handler to view note detail (except for sticky notes and already in detail view)
    if (!isSticky && !isDetail) {
        noteDiv.addEventListener('click', () => {
            showView('noteDetail', { noteId: note.id });
        });
    }

    // Add click handlers for note references
    noteDiv.querySelectorAll('.note-reference').forEach(ref => {
        ref.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = parseInt(ref.dataset.noteId);
            showView('noteDetail', { noteId });
        });
    });

    // Add click handlers for hashtags
    noteDiv.querySelectorAll('.hashtag').forEach(hashtagEl => {
        hashtagEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const hashtag = hashtagEl.dataset.hashtag;
            showView('hashtagFilter', { hashtag });
        });
    });

    // Add dismiss handler for sticky notes
    if (isSticky) {
        const dismissBtn = noteDiv.querySelector('.dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await addDismissal(note.id);
                await refreshNotes();
            });
        }
    }

    return noteDiv;
}

// Display note detail in view
async function displayNoteDetail(noteId) {
    const note = await getNoteById(noteId);
    if (!note) {
        alert('Note not found');
        goBack();
        return;
    }

    const container = document.getElementById('noteDetailContent');
    const noteElement = renderNote(note, false, true);
    container.innerHTML = '';
    container.appendChild(noteElement);
}

// Display hashtag filter view
async function displayHashtagFilter(hashtag) {
    const allNotes = await getAllNotes();
    const filteredNotes = allNotes.filter(note =>
        note.hashtags && note.hashtags.includes(hashtag.toLowerCase())
    );

    const title = document.getElementById('hashtagFilterTitle');
    const container = document.getElementById('hashtagFilteredNotes');

    title.textContent = `Notes tagged with #${hashtag}`;
    container.innerHTML = '';

    if (filteredNotes.length === 0) {
        container.innerHTML = '<p>No notes found with this hashtag.</p>';
    } else {
        filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        filteredNotes.forEach(note => {
            container.appendChild(renderNote(note, false, false));
        });
    }
}

// ===== SEARCH =====

let currentSearchQuery = '';
let isSearchActive = false;

// Perform full-text search
async function searchNotes(query) {
    if (!query.trim()) {
        isSearchActive = false;
        currentSearchQuery = '';
        await refreshNotes();
        document.getElementById('searchResultsHeader').classList.add('hidden');
        return;
    }

    isSearchActive = true;
    currentSearchQuery = query;

    const allNotes = await getAllNotes();
    const lowerQuery = query.toLowerCase();

    // Check if it's a hashtag search
    const isHashtagSearch = query.startsWith('#');
    let results;

    if (isHashtagSearch) {
        const hashtag = query.substring(1).toLowerCase();
        results = allNotes.filter(note =>
            note.hashtags && note.hashtags.some(tag => tag.includes(hashtag))
        );
    } else {
        // Full-text search
        results = allNotes.filter(note => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content;
            const textContent = (tempDiv.textContent || tempDiv.innerText).toLowerCase();

            const matchesContent = textContent.includes(lowerQuery);
            const matchesNickname = note.locationNickname &&
                note.locationNickname.toLowerCase().includes(lowerQuery);
            const matchesTags = note.hashtags &&
                note.hashtags.some(tag => tag.includes(lowerQuery));

            return matchesContent || matchesNickname || matchesTags;
        });
    }

    // Display results
    displaySearchResults(results, query);
}

// Display search results
function displaySearchResults(notes, query) {
    const header = document.getElementById('searchResultsHeader');
    const container = document.getElementById('notesList');
    const stickyContainer = document.getElementById('stickyNotes');

    header.textContent = `Search results for "${query}" (${notes.length} found)`;
    header.classList.remove('hidden');

    // Clear sticky notes during search
    stickyContainer.innerHTML = '';

    container.innerHTML = '';
    if (notes.length === 0) {
        container.innerHTML = '<p>No notes found matching your search.</p>';
    } else {
        notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        notes.forEach(note => {
            container.appendChild(renderNote(note, false));
        });
    }
}

// Autocomplete for hashtags
async function showHashtagAutocomplete(input) {
    const dropdown = document.getElementById('autocompleteDropdown');

    if (!input.startsWith('#')) {
        dropdown.classList.remove('active');
        return;
    }

    const query = input.substring(1).toLowerCase();
    if (!query) {
        dropdown.classList.remove('active');
        return;
    }

    const allHashtags = await getAllHashtags();
    const matches = allHashtags.filter(tag => tag.includes(query));

    if (matches.length === 0) {
        dropdown.classList.remove('active');
        return;
    }

    dropdown.innerHTML = '';
    matches.slice(0, 10).forEach(tag => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = '#' + tag;
        item.addEventListener('click', () => {
            document.getElementById('searchBox').value = '#' + tag;
            dropdown.classList.remove('active');
            searchNotes('#' + tag);
        });
        dropdown.appendChild(item);
    });

    dropdown.classList.add('active');
}

// ===== PROXIMITY SCORING =====

// Calculate time proximity score (higher = more relevant)
function calculateTimeProximity(note, currentTime) {
    if (!note.scheduledTime) {
        return 0; // No scheduled time = neutral score
    }

    const noteTime = new Date(note.scheduledTime);
    const current = new Date(currentTime);

    // Calculate difference in minutes
    const diffMs = Math.abs(current - noteTime);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // Within current 5-minute window = highest score
    const currentWindow = getTimeWindow(current);
    const noteWindow = getTimeWindow(noteTime);

    if (currentWindow === noteWindow) {
        return 1000; // Exact match - highest priority
    }

    // Within ±5 minutes (neighboring window)
    if (diffMinutes <= 10) {
        return 500 - (diffMinutes * 10); // 500 to 400
    }

    // Within ±30 minutes
    if (diffMinutes <= 30) {
        return 400 - (diffMinutes * 5); // 400 to 250
    }

    // Within ±1 hour
    if (diffMinutes <= 60) {
        return 250 - (diffMinutes * 2); // 250 to 130
    }

    // Beyond 1 hour - very low priority
    return Math.max(0, 100 - diffMinutes);
}

// Calculate location proximity score (higher = more relevant)
async function calculateLocationProximity(note) {
    if (!note.locationId) {
        return 0; // No location = neutral score
    }

    if (!currentPosition) {
        return 0; // Can't calculate without current position
    }

    const locations = await getAllLocations();
    const noteLocation = locations.find(loc => loc.id === note.locationId);

    if (!noteLocation) {
        return 0;
    }

    const distance = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        noteLocation.latitude,
        noteLocation.longitude
    );

    // Within 10m = perfect match
    if (distance <= 10) {
        return 1000;
    }

    // Within 50m = close
    if (distance <= 50) {
        return 800 - (distance * 4); // 800 to 600
    }

    // Within 100m = nearby
    if (distance <= 100) {
        return 600 - (distance * 2); // 600 to 400
    }

    // Within 500m = visible on map
    if (distance <= 500) {
        return 400 - (distance * 0.5); // 400 to 150
    }

    // Beyond 500m - very low priority
    return Math.max(0, 100 - (distance / 10));
}

// Calculate hashtag match score
function calculateHashtagMatchScore(note, locationHashtags) {
    if (!locationHashtags || locationHashtags.length === 0) {
        return 0;
    }

    if (!note.hashtags || note.hashtags.length === 0) {
        return 0;
    }

    const matchingTags = note.hashtags.filter(tag =>
        locationHashtags.includes(tag)
    );

    // Each matching hashtag adds to the score
    return matchingTags.length * 300;
}

// Calculate combined proximity score for sorting
async function calculateNoteProximity(note, currentTime, locationHashtags) {
    const timeScore = calculateTimeProximity(note, currentTime);
    const locationScore = await calculateLocationProximity(note);
    const hashtagScore = calculateHashtagMatchScore(note, locationHashtags);

    // Combined score with weights
    // Priority: Time + Location are most important, hashtags as bonus
    const combinedScore = (timeScore * 1.5) + (locationScore * 1.2) + hashtagScore;

    return {
        total: combinedScore,
        time: timeScore,
        location: locationScore,
        hashtag: hashtagScore,
        note: note
    };
}

// ===== DISPLAY NOTES =====

async function refreshNotes() {
    // If search is active, don't refresh automatically
    if (isSearchActive) {
        return;
    }

    const allNotes = await getAllNotes();
    const matchingLocation = await findMatchingLocation();
    const currentTime = new Date();
    const currentTimeWindow = getTimeWindow(currentTime);

    // Get location hashtags if at a location
    let locationHashtags = [];
    if (matchingLocation && matchingLocation.hashtags) {
        locationHashtags = matchingLocation.hashtags;
    }

    // Separate sticky (scheduled) and regular notes
    const stickyNotes = [];
    const candidateNotes = []; // Notes that might be displayed

    for (const note of allNotes) {
        // Check if this is a scheduled note that should be shown as sticky
        if (note.scheduledTime && isScheduledNoteActive(note.scheduledTime)) {
            const dismissed = await isNoteDismissed(note.id, currentTimeWindow);
            if (!dismissed) {
                stickyNotes.push(note);
            }
        }

        // Collect all notes that might be relevant
        // We'll use proximity scoring to determine which ones to show
        candidateNotes.push(note);
    }

    // Calculate proximity scores for all candidate notes
    const notesWithScores = await Promise.all(
        candidateNotes.map(note => calculateNoteProximity(note, currentTime, locationHashtags))
    );

    // Filter notes with meaningful proximity (score > 0)
    // This includes:
    // - Notes at current location (high location score)
    // - Notes with scheduled times near current time (high time score)
    // - Notes with hashtags matching location (hashtag score)
    // - Nearby notes not yet dismissed
    const relevantNotes = notesWithScores.filter(scored => scored.total > 0);

    // Sort by total proximity score (highest first)
    relevantNotes.sort((a, b) => b.total - a.total);

    // For sticky notes, also sort by proximity
    const stickyNotesWithScores = await Promise.all(
        stickyNotes.map(note => calculateNoteProximity(note, currentTime, locationHashtags))
    );
    stickyNotesWithScores.sort((a, b) => b.total - a.total);

    // Render sticky notes
    const stickyContainer = document.getElementById('stickyNotes');
    stickyContainer.innerHTML = '';
    stickyNotesWithScores.forEach(scored => {
        stickyContainer.appendChild(renderNote(scored.note, true));
    });

    // Render regular notes
    const notesContainer = document.getElementById('notesList');
    notesContainer.innerHTML = '';

    // Clear search header when not searching
    document.getElementById('searchResultsHeader').classList.add('hidden');

    if (relevantNotes.length === 0) {
        notesContainer.innerHTML = '<p>No notes for this location.</p>';
    } else {
        relevantNotes.forEach(scored => {
            notesContainer.appendChild(renderNote(scored.note, false));
        });
    }
}

// ===== LOCATION INFO =====

async function updateLocationInfo() {
    const statusDiv = document.getElementById('locationStatus');
    const detailsDiv = document.getElementById('locationDetails');

    if (!currentPosition) {
        statusDiv.textContent = 'Location unavailable';
        detailsDiv.textContent = '';
        return;
    }

    const matchingLocation = await findMatchingLocation();

    let statusText = 'Location: ' +
        (matchingLocation ? `${matchingLocation.nickname}` : 'Current position');

    if (matchingLocation && matchingLocation.hashtags && matchingLocation.hashtags.length > 0) {
        statusText += ` (Tags: ${matchingLocation.hashtags.map(t => '#' + t).join(', ')})`;
    }

    statusDiv.textContent = statusText;

    detailsDiv.textContent = `Lat: ${currentPosition.latitude.toFixed(6)}, ` +
                            `Lon: ${currentPosition.longitude.toFixed(6)}, ` +
                            `Accuracy: ±${Math.round(currentPosition.accuracy)}m`;
}

// ===== MANAGE LOCATIONS =====

let selectedLocationForTagging = null;

async function showManageLocations() {
    const locationsList = document.getElementById('locationsList');

    const locations = await getAllLocations();

    if (locations.length === 0) {
        locationsList.innerHTML = '<p>No saved locations yet.</p>';
    } else {
        locationsList.innerHTML = locations.map(loc => {
            const tagsDisplay = loc.hashtags && loc.hashtags.length > 0
                ? `<div class="location-tags">${loc.hashtags.map(t =>
                    `<span class="tag-badge">#${t}</span>`
                ).join('')}</div>`
                : '';

            return `
            <div class="location-item">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <strong>${loc.nickname}</strong>
                    <button class="manage-tags-btn secondary" data-location-id="${loc.id}">
                        <span class="icon">🏷️</span>
                        <span class="button-text">Manage Tags</span>
                    </button>
                </div>
                <div style="font-size: 0.85rem; color: var(--pico-muted-color); margin-top: 0.25rem;">
                    Lat: ${loc.latitude.toFixed(6)}, Lon: ${loc.longitude.toFixed(6)}<br>
                    Created: ${new Date(loc.createdAt).toLocaleString()}
                </div>
                ${tagsDisplay}
            </div>
        `;
        }).join('');

        // Add click handlers for manage tags buttons
        locationsList.querySelectorAll('.manage-tags-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const locationId = parseInt(e.target.dataset.locationId);
                await showLocationTagging(locationId);
            });
        });
    }
}

async function showLocationTagging(locationId) {
    selectedLocationForTagging = locationId;
    const location = await getLocationById(locationId);

    if (!location) return;

    const taggingDiv = document.getElementById('locationTagging');
    const locationName = document.getElementById('selectedLocationName');
    const currentTags = document.getElementById('currentLocationTags');

    locationName.textContent = `Location: ${location.nickname}`;

    // Display current tags
    if (location.hashtags && location.hashtags.length > 0) {
        currentTags.innerHTML = location.hashtags.map(tag =>
            `<span class="tag-badge">#${tag} <span style="cursor: pointer;" data-tag="${tag}" class="remove-tag">×</span></span>`
        ).join('');

        // Add remove tag handlers
        currentTags.querySelectorAll('.remove-tag').forEach(span => {
            span.addEventListener('click', async (e) => {
                const tagToRemove = e.target.dataset.tag;
                await removeTagFromLocation(locationId, tagToRemove);
            });
        });
    } else {
        currentTags.innerHTML = '<em>No tags attached to this location</em>';
    }

    taggingDiv.classList.remove('hidden');
}

async function addTagToLocation(locationId, tag) {
    const location = await getLocationById(locationId);
    if (!location) return;

    if (!location.hashtags) {
        location.hashtags = [];
    }

    const normalizedTag = tag.toLowerCase().replace(/^#/, '').trim();

    if (!normalizedTag) {
        alert('Please enter a valid tag');
        return;
    }

    if (location.hashtags.includes(normalizedTag)) {
        alert('This tag is already attached to this location');
        return;
    }

    location.hashtags.push(normalizedTag);
    await addLocation(location);
    await showLocationTagging(locationId);
    await updateLocationInfo();
}

async function removeTagFromLocation(locationId, tag) {
    const location = await getLocationById(locationId);
    if (!location || !location.hashtags) return;

    location.hashtags = location.hashtags.filter(t => t !== tag);
    await addLocation(location);
    await showLocationTagging(locationId);
    await updateLocationInfo();
}

// ===== EXPORT / IMPORT =====

async function exportData() {
    const notes = await getAllNotes();
    const locations = await getAllLocations();

    const exportData = {
        notes,
        locations,
        exportedAt: new Date().toISOString(),
        version: 2
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `locnotes-export-${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    alert('Data exported successfully!');
}

async function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);

        if (!data.notes || !data.locations) {
            throw new Error('Invalid export format');
        }

        // Clear existing data
        const clearNotes = db.transaction(['notes'], 'readwrite').objectStore('notes').clear();
        const clearLocations = db.transaction(['locations'], 'readwrite').objectStore('locations').clear();

        await Promise.all([
            new Promise((resolve, reject) => {
                clearNotes.onsuccess = resolve;
                clearNotes.onerror = reject;
            }),
            new Promise((resolve, reject) => {
                clearLocations.onsuccess = resolve;
                clearLocations.onerror = reject;
            })
        ]);

        // Import locations first
        for (const location of data.locations) {
            await addLocation(location);
        }

        // Import notes
        for (const note of data.notes) {
            await addNote(note);
        }

        alert('Data imported successfully!');
        await refreshNotes();
        await updateLocationInfo();
    } catch (error) {
        alert('Import failed: ' + error.message);
        console.error('Import error:', error);
    }
}

// ===== QUILL EDITOR =====

let quill = null;

function initQuillEditor() {
    quill = new Quill('#editor', {
        theme: 'snow',
        placeholder: 'Write your note here...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'header': [1, 2, 3, false] }],
                ['link'],
                ['clean']
            ]
        }
    });
}

// ===== UI INTERACTIONS =====

// Toggle create note form visibility
function toggleCreateNoteForm() {
    const form = document.getElementById('createNoteForm');
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
        // Scroll to the top of the main content area to show the form
        const mainContent = document.querySelector('.main-content');
        mainContent.scrollTop = 0;
        // Focus on the editor
        setTimeout(() => quill.focus(), 100);
    } else {
        hideCreateNoteForm();
    }
}

// Hide create note form and reset it
function hideCreateNoteForm() {
    const form = document.getElementById('createNoteForm');
    form.classList.add('hidden');
    // Clear form
    quill.setContents([]);
    document.getElementById('locationNickname').value = '';
    document.getElementById('scheduleNote').checked = false;
    document.getElementById('scheduleOptions').classList.add('hidden');
    document.getElementById('scheduledDateTime').value = '';
}

function setupEventListeners() {
    // Back button
    document.getElementById('backButton').addEventListener('click', () => {
        goBack();
    });

    // Help button
    document.getElementById('helpButton').addEventListener('click', () => {
        showView('help');
    });

    // Bottom navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const viewName = item.dataset.view;
            if (viewName) {
                showView(viewName);
            }
        });
    });

    // Desktop action buttons
    const newNoteBtnDesktop = document.getElementById('newNoteBtnDesktop');
    if (newNoteBtnDesktop) {
        newNoteBtnDesktop.addEventListener('click', () => {
            toggleCreateNoteForm();
        });
    }

    // Mobile new note button
    const newNoteBtnMobile = document.getElementById('newNoteBtnMobile');
    if (newNoteBtnMobile) {
        newNoteBtnMobile.addEventListener('click', () => {
            toggleCreateNoteForm();
        });
    }

    const manageLocationsBtnDesktop = document.getElementById('manageLocationsBtnDesktop');
    if (manageLocationsBtnDesktop) {
        manageLocationsBtnDesktop.addEventListener('click', () => {
            showView('locations');
        });
    }

    const exportBtnDesktop = document.getElementById('exportBtnDesktop');
    if (exportBtnDesktop) {
        exportBtnDesktop.addEventListener('click', () => {
            exportData();
        });
    }

    const importBtnDesktop = document.getElementById('importBtnDesktop');
    if (importBtnDesktop) {
        importBtnDesktop.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
    }

    // Cancel Note button
    document.getElementById('cancelNoteBtn').addEventListener('click', () => {
        hideCreateNoteForm();
    });

    // Schedule checkbox
    document.getElementById('scheduleNote').addEventListener('change', (e) => {
        const scheduleOptions = document.getElementById('scheduleOptions');
        if (e.target.checked) {
            scheduleOptions.classList.remove('hidden');
        } else {
            scheduleOptions.classList.add('hidden');
        }
    });

    // Save Note button
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        await saveNote();
    });

    // Add tag to location
    document.getElementById('addTagBtn').addEventListener('click', async () => {
        const tagInput = document.getElementById('tagInput');
        const tag = tagInput.value.trim();

        if (selectedLocationForTagging && tag) {
            await addTagToLocation(selectedLocationForTagging, tag);
            tagInput.value = '';
        }
    });

    // Search box
    const searchBox = document.getElementById('searchBox');
    let searchTimeout = null;

    searchBox.addEventListener('input', (e) => {
        const query = e.target.value;

        // Show autocomplete for hashtags
        if (query.startsWith('#')) {
            showHashtagAutocomplete(query);
        } else {
            document.getElementById('autocompleteDropdown').classList.remove('active');
        }

        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchNotes(query);
        }, 300);
    });

    searchBox.addEventListener('blur', () => {
        // Delay to allow clicking on autocomplete items
        setTimeout(() => {
            document.getElementById('autocompleteDropdown').classList.remove('active');
        }, 200);
    });

    // Export button (in settings)
    document.getElementById('exportBtn').addEventListener('click', () => {
        exportData();
    });

    // Import button (in settings)
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    // Import file input
    document.getElementById('importFile').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            importData(event.target.result);
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    });
}

// Save note
async function saveNote() {
    const attachToLocation = document.getElementById('attachToLocation').checked;
    const locationNickname = document.getElementById('locationNickname').value.trim();
    const scheduleNote = document.getElementById('scheduleNote').checked;
    const scheduledDateTime = document.getElementById('scheduledDateTime').value;

    const content = quill.root.innerHTML;

    if (!content || content === '<p><br></p>') {
        alert('Please write some content for the note');
        return;
    }

    // Extract hashtags from content
    const hashtags = extractHashtags(content);

    let locationId = null;
    let finalLocationNickname = null;

    // Handle location attachment
    if (attachToLocation) {
        if (!currentPosition) {
            alert('Current location is not available');
            return;
        }

        // Check if we need to create or update a location
        if (locationNickname) {
            let location = await getLocationByNickname(locationNickname);

            if (!location) {
                // Create new location
                locationId = await addLocation({
                    nickname: locationNickname,
                    latitude: currentPosition.latitude,
                    longitude: currentPosition.longitude,
                    createdAt: new Date().toISOString(),
                    hashtags: []
                });
            } else {
                locationId = location.id;
            }
            finalLocationNickname = locationNickname;
        } else {
            // Find matching location or create unnamed one
            const matchingLocation = await findMatchingLocation();
            if (matchingLocation) {
                locationId = matchingLocation.id;
                finalLocationNickname = matchingLocation.nickname;
            } else {
                // Create location without nickname
                locationId = await addLocation({
                    nickname: `Location_${Date.now()}`,
                    latitude: currentPosition.latitude,
                    longitude: currentPosition.longitude,
                    createdAt: new Date().toISOString(),
                    hashtags: []
                });
            }
        }
    }

    // Handle scheduled note
    let scheduledTime = null;
    if (scheduleNote && scheduledDateTime) {
        scheduledTime = new Date(scheduledDateTime).toISOString();
    }

    // Create note
    const note = {
        content,
        locationId,
        locationNickname: finalLocationNickname,
        scheduledTime,
        hashtags,
        createdAt: new Date().toISOString()
    };

    await addNote(note);

    // Hide the form and clear it
    hideCreateNoteForm();

    // Refresh notes list
    await refreshNotes();
    await updateLocationInfo();

    alert('Note saved successfully!');
}

// ===== INITIALIZATION =====

async function init() {
    try {
        // Initialize database
        await initDB();

        // Initialize Quill editor
        initQuillEditor();

        // Setup event listeners
        setupEventListeners();

        // Request location
        document.getElementById('locationStatus').textContent = 'Requesting location permission...';

        try {
            await getCurrentLocation();
            await updateLocationInfo();
        } catch (error) {
            document.getElementById('locationStatus').textContent = 'Location permission denied or unavailable';
            console.error('Geolocation error:', error);
        }

        // Load and display notes
        await refreshNotes();

        // Set initial history state
        history.replaceState({ view: 'notes', data: null }, '', '#notes');

        // Refresh notes every minute to check for new scheduled notes
        setInterval(async () => {
            await getCurrentLocation().catch(() => {}); // Update location silently
            if (!isSearchActive) {
                await refreshNotes();
            }
        }, 60000);

    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize app: ' + error.message);
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
