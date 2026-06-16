document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allNotes = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedNote = null;
    let activeTweetStyle = 'standard';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const lastSyncEl = document.getElementById('last-sync');
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const categoryFiltersEl = document.getElementById('category-filters');
    const feedTimelineEl = document.getElementById('feed-timeline');
    const loadingStateEl = document.getElementById('loading-state');
    const errorStateEl = document.getElementById('error-state');
    const errorMessageEl = document.getElementById('error-message');
    const errorRetryBtn = document.getElementById('error-retry-btn');
    const emptyStateEl = document.getElementById('empty-state');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Stats Elements
    const statTotalEl = document.getElementById('stat-total');
    const statFeaturesEl = document.getElementById('stat-features');
    const statChangesEl = document.getElementById('stat-changes');
    const statDeprecationsEl = document.getElementById('stat-deprecations');

    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const previewBadge = document.getElementById('preview-badge');
    const previewDate = document.getElementById('preview-date');
    const previewText = document.getElementById('preview-text');
    const styleTabs = document.querySelectorAll('.style-tab');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const charProgressBar = document.getElementById('char-progress-bar');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const toast = document.getElementById('toast');

    // Theme Initializer
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleCheckbox.checked = true;
    }

    // Theme Toggle Handler
    themeToggleCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        }
    });

    // Load initial data
    fetchNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));
    errorRetryBtn.addEventListener('click', () => fetchNotes(true));
    clearFiltersBtn.addEventListener('click', resetSearchAndFilters);
    exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Search event with instant filter
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
        filterAndRender();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        filterAndRender();
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', () => {
        tweetModal.style.display = 'none';
        document.body.style.overflow = '';
    });

    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            tweetModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Modal Textarea Count Tracker
    tweetTextarea.addEventListener('input', () => {
        updateCharCount(tweetTextarea.value.length);
        updatePostUrl(tweetTextarea.value);
    });

    // Modal Style Tabs
    styleTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            styleTabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            activeTweetStyle = e.target.dataset.style;
            generateTweetText();
        });
    });

    // Copy Tweet Action
    copyTweetBtn.addEventListener('click', () => {
        tweetTextarea.select();
        navigator.clipboard.writeText(tweetTextarea.value)
            .then(() => showToast('Copied to clipboard!'))
            .catch(err => {
                console.error('Failed to copy text: ', err);
                showToast('Failed to copy text', true);
            });
    });

    // Fetch Release Notes
    function fetchNotes(forceRefresh = false) {
        setLoading(true);
        let url = '/api/notes';
        if (forceRefresh) {
            url += '?refresh=true';
            refreshBtn.classList.add('loading');
        }

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    allNotes = data.notes;
                    updateDashboardStats(data.stats);
                    updateLastSyncTime(data.stats.cache_time || data.stats.last_fetched);
                    renderCategoryFilters(data.stats.categories);
                    filterAndRender();
                    
                    if (forceRefresh) {
                        showToast('Sync completed successfully!');
                    }
                } else {
                    throw new Error(data.message || 'Unknown backend error');
                }
            })
            .catch(err => {
                console.error(err);
                errorMessageEl.textContent = `Error details: ${err.message}. Please verify the internet connection and try again.`;
                showState('error');
            })
            .finally(() => {
                setLoading(false);
                refreshBtn.classList.remove('loading');
            });
    }

    // Set Loading UI
    function setLoading(isLoading) {
        if (isLoading) {
            showState('loading');
        }
    }

    // Show States (loading, error, empty, content)
    function showState(state) {
        loadingStateEl.style.display = state === 'loading' ? 'block' : 'none';
        errorStateEl.style.display = state === 'error' ? 'flex' : 'none';
        emptyStateEl.style.display = state === 'empty' ? 'flex' : 'none';
        feedTimelineEl.style.display = state === 'content' ? 'flex' : 'none';
    }

    // Update Dashboard Metrics Cards
    function updateDashboardStats(stats) {
        statTotalEl.textContent = stats.total_items;
        statFeaturesEl.textContent = stats.categories['Feature'] || 0;
        statChangesEl.textContent = stats.categories['Change'] || 0;
        statDeprecationsEl.textContent = stats.categories['Deprecation'] || 0;
    }

    // Render Sync Time
    function updateLastSyncTime(isoString) {
        if (!isoString) {
            lastSyncEl.textContent = 'Syncing...';
            return;
        }
        const date = new Date(isoString);
        lastSyncEl.textContent = `Sync: ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Render Filters based on Categories found
    function renderCategoryFilters(categories) {
        // Keep "All" tab
        const currentActive = activeCategory;
        categoryFiltersEl.innerHTML = `<button class="filter-tag ${currentActive === 'all' ? 'active' : ''}" data-category="all">All</button>`;
        
        // Sort categories by count desc
        const sortedCats = Object.entries(categories).sort((a, b) => b[1] - a[1]);
        
        sortedCats.forEach(([catName, count]) => {
            const btn = document.createElement('button');
            btn.className = `filter-tag ${currentActive === catName ? 'active' : ''}`;
            btn.dataset.category = catName;
            btn.textContent = `${catName} (${count})`;
            categoryFiltersEl.appendChild(btn);
        });

        // Add filter click event delegates
        categoryFiltersEl.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                categoryFiltersEl.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                activeCategory = e.target.dataset.category;
                filterAndRender();
            });
        });
    }

    // Reset filters
    function resetSearchAndFilters() {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        activeCategory = 'all';
        categoryFiltersEl.querySelectorAll('.filter-tag').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.category === 'all') t.classList.add('active');
        });
        filterAndRender();
    }

    // Filter and Render Timeline Cards
    function filterAndRender() {
        if (allNotes.length === 0) {
            showState('empty');
            return;
        }

        // Apply Category and Search filters
        const filtered = allNotes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category === activeCategory;
            const matchesSearch = !searchQuery || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.description.toLowerCase().includes(searchQuery);
            
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            showState('empty');
            return;
        }

        // Render cards
        feedTimelineEl.innerHTML = '';
        filtered.forEach(note => {
            feedTimelineEl.appendChild(createReleaseCard(note));
        });
        showState('content');
    }

    // Helper to generate release card HTML node
    function createReleaseCard(note) {
        const card = document.createElement('article');
        const catClass = `cat-${note.category.toLowerCase()}`;
        card.className = `release-card ${catClass}`;
        card.dataset.id = note.id;

        const dateFormatted = note.date;
        const categoryBadge = note.category;

        card.innerHTML = `
            <div class="card-header">
                <div class="header-meta">
                    <span class="badge ${categoryBadge.toLowerCase()}">${categoryBadge}</span>
                    <span class="date-stamp">${dateFormatted}</span>
                </div>
                <div class="card-actions">
                    <button class="card-btn link-btn" title="Open Official Google Release Notes" onclick="window.open('${note.link}', '_blank')">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                    <button class="card-btn copy-btn" title="Copy Note to Clipboard">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button class="card-btn tweet-btn" title="Create X/Tweet Post">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-body">
                ${note.description}
            </div>
        `;

        // Event for Copy button
        card.querySelector('.copy-btn').addEventListener('click', () => {
            const plainText = formatDescriptionForTweet(note.description);
            navigator.clipboard.writeText(plainText)
                .then(() => showToast('Note copied to clipboard!'))
                .catch(err => {
                    console.error('Failed to copy: ', err);
                    showToast('Failed to copy note', true);
                });
        });

        // Event for Share button
        card.querySelector('.tweet-btn').addEventListener('click', () => openTweetModal(note));

        return card;
    }

    // Modal Controller: Open and Configure
    function openTweetModal(note) {
        selectedNote = note;
        
        // Reset tabs
        styleTabs.forEach(t => t.classList.remove('active'));
        document.querySelector('.style-tab[data-style="standard"]').classList.add('active');
        activeTweetStyle = 'standard';

        // Configure Preview inside Modal
        previewBadge.className = `preview-badge ${note.category.toLowerCase()}`;
        previewBadge.textContent = note.category;
        previewDate.textContent = note.date;
        previewText.innerHTML = note.description;

        // Generate Tweet Text
        generateTweetText();

        // Show Modal
        tweetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // Convert HTML note description to friendly plain text layout for tweet
    function formatDescriptionForTweet(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;

        // Format bullet lists nicely
        tmp.querySelectorAll('li').forEach(li => {
            li.innerHTML = `• ${li.innerHTML.trim()}\n`;
        });
        
        // Format paragraphs with standard spacing
        tmp.querySelectorAll('p').forEach(p => {
            p.innerHTML = `${p.innerHTML.trim()}\n\n`;
        });

        // Strip tags
        let text = tmp.innerText || tmp.textContent || "";
        
        // Trim double spaces or linebreaks excess
        text = text.replace(/\n{3,}/g, '\n\n').trim();
        return text;
    }

    // Draft Post text based on template styles
    function generateTweetText() {
        if (!selectedNote) return;

        const dateStr = selectedNote.date;
        const cat = selectedNote.category;
        const link = selectedNote.link;
        const detailsText = formatDescriptionForTweet(selectedNote.description);
        
        // Shorten detailsText if it overflows
        const maxDetailsLen = 150;
        let shortDetails = detailsText;
        if (shortDetails.length > maxDetailsLen) {
            shortDetails = shortDetails.substring(0, maxDetailsLen) + '...';
        }

        let tweetText = '';

        switch(activeTweetStyle) {
            case 'hype':
                tweetText = `🔥 BigQuery just dropped a new ${cat}! [${dateStr}]\n\n${shortDetails}\n\nCheck it out here:\n👉 ${link}\n\n#GoogleCloud #BigQuery #DataEngineering`;
                break;
            case 'tldr':
                tweetText = `💡 BigQuery TL;DR [${cat}] - ${dateStr}\n\n${shortDetails}\n\n🔗 ${link}\n\n#GCP #BigData`;
                break;
            case 'professional':
                tweetText = `💼 Google Cloud BigQuery Release Update:\n\nCategory: ${cat}\nDate: ${dateStr}\n\n${shortDetails}\n\nOfficial Notes:\n🔗 ${link}\n\n#GoogleCloud #BigQuery #EnterpriseTech`;
                break;
            case 'standard':
            default:
                tweetText = `🚀 New BigQuery Update (${dateStr})\n\n[${cat}] ${shortDetails}\n\nRead more detail:\n🔗 ${link}\n\n#BigQuery #GoogleCloud`;
                break;
        }

        tweetTextarea.value = tweetText;
        updateCharCount(tweetText.length);
        updatePostUrl(tweetText);
    }

    // Track length and style progress bar
    function updateCharCount(length) {
        charCounter.textContent = `${length} / 280`;
        
        // Progress bar width
        const pct = Math.min((length / 280) * 100, 100);
        charProgressBar.style.width = `${pct}%`;

        // Style categories based on length limits
        if (length > 280) {
            charCounter.classList.add('error');
            charProgressBar.className = 'char-progress-bar error';
            postTweetBtn.classList.add('loading'); // Disable link action
            postTweetBtn.style.pointerEvents = 'none';
            postTweetBtn.style.opacity = '0.5';
        } else if (length > 250) {
            charCounter.classList.remove('error');
            charCounter.classList.add('warning');
            charProgressBar.className = 'char-progress-bar warning';
            postTweetBtn.classList.remove('loading');
            postTweetBtn.style.pointerEvents = 'auto';
            postTweetBtn.style.opacity = '1';
        } else {
            charCounter.classList.remove('error', 'warning');
            charProgressBar.className = 'char-progress-bar';
            postTweetBtn.classList.remove('loading');
            postTweetBtn.style.pointerEvents = 'auto';
            postTweetBtn.style.opacity = '1';
        }
    }

    // Export currently visible/filtered notes to CSV
    function exportToCSV() {
        const filtered = allNotes.filter(note => {
            const matchesCategory = activeCategory === 'all' || note.category === activeCategory;
            const matchesSearch = !searchQuery || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.description.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            showToast('No notes to export', true);
            return;
        }

        // CSV Rows Header
        const csvRows = [['Date', 'Category', 'Description', 'Link']];

        filtered.forEach(note => {
            // Convert HTML to clean plain text description and escape double quotes
            const cleanDesc = formatDescriptionForTweet(note.description)
                .replace(/"/g, '""');
            csvRows.push([
                `"${note.date}"`,
                `"${note.category}"`,
                `"${cleanDesc}"`,
                `"${note.link}"`
            ]);
        });

        const csvContent = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        
        link.click();
        
        document.body.removeChild(link);
        showToast('Exported CSV successfully!');
    }

    // Sync Post Url with Twitter/X web intent
    function updatePostUrl(text) {
        const encodedText = encodeURIComponent(text);
        postTweetBtn.href = `https://x.com/intent/tweet?text=${encodedText}`;
    }

    // Show alert notifications (Toast)
    function showToast(msg, isError = false) {
        toast.textContent = msg;
        toast.className = 'toast';
        if (isError) {
            toast.classList.add('error');
        }
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
