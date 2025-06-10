document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // ==               הקישורים שלך נשמרו כפי שהם                  ==
    // ===================================================================
    // קישור לקובץ CSV של גיליון "הזנת נתונים - משחקים"
    const RAW_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjSHec_HTnsbDypeWhzQZalUoOGvuPFsUhzung3nnM8cj9vIfeCgWf4KakONdwXC36XOQQ8ZuAwPlN/pub?gid=1634847815&single=true&output=csv';
    
    // קישור לקובץ CSV של גיליון "רשימת שחקנים"
    const PLAYERS_LIST_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjSHec_HTnsbDypeWhzQZalUoOGvuPFsUhzung3nnM8cj9vIfeCgWf4KakONdwXC36XOQQ8ZuAwPlN/pub?gid=0&single=true&output=csv';
    // ===================================================================

    // DOM Elements
    const loader = document.getElementById('loader');
    const lastUpdated = document.getElementById('last-updated');
    const overallContainer = document.getElementById('overall-view-container');
    const byGameContainer = document.getElementById('by-game-view-container');
    const overallBtn = document.getElementById('overall-view-btn');
    const byGameBtn = document.getElementById('by-game-view-btn');

    let allPlayersList = [];
    let allGamesData = [];
    let byGameViewRendered = false; // Flag to render by-game view only once

    // --- Fetch both datasets at the same time ---
    Promise.all([
        fetch(RAW_DATA_URL).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch RAW_DATA_URL: ${res.statusText}`);
            return res.text();
        }),
        fetch(PLAYERS_LIST_URL).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch PLAYERS_LIST_URL: ${res.statusText}`);
            return res.text();
        })
    ])
    .then(([csvRawData, csvPlayersList]) => {
        loader.style.display = 'none';

        // 1. Parse the master list of all players
        allPlayersList = csvPlayersList.trim().split('\n')
            .map(row => row.trim())
            .filter(name => name && name.toLowerCase() !== 'שם השחקן');

        if (allPlayersList.length === 0) {
            throw new Error("Could not parse player list. Please ensure 'רשימת שחקנים' is published correctly and contains names.");
        }

        // 2. Parse the raw game data
        const rows = csvRawData.trim().split('\n').slice(1);
        allGamesData = rows.map(row => {
            const cells = row.split(',');
            if (cells.length < 6) return null;
            
            const [date, name, hasPlayed] = cells;
            if (!hasPlayed || hasPlayed.trim().toLowerCase() !== 'true') {
                return null;
            }
            
            const dateParts = date.trim().split('/');
            if (dateParts.length !== 3) return null;
            const [day, month, year] = dateParts;
            const isoDateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            
            return {
                date: isoDateString,
                name: name.trim(),
                games: parseInt(cells[3], 10) || 0,
                goals: parseInt(cells[4], 10) || 0,
                assists: parseInt(cells[5], 10) || 0
            };
        }).filter(Boolean);

        // 3. Render the initial view
        renderOverallView();
        lastUpdated.textContent = `עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}`;
    })
    .catch(error => {
        console.error('FINAL ERROR:', error);
        loader.style.display = 'none';
        lastUpdated.textContent = `שגיאה בטעינת הנתונים: ${error.message}`;
        lastUpdated.style.color = 'red';
    });

    /**
     * Calculates stats, ensuring all players from the master list are included.
     */
    function calculateOverallStats(playersList, rawData) {
        const stats = new Map();
        playersList.forEach(player => {
            stats.set(player, { name: player, games: 0, goals: 0, assists: 0 });
        });
        rawData.forEach(game => {
            if (stats.has(game.name)) {
                const current = stats.get(game.name);
                current.games += game.games;
                current.goals += game.goals;
                current.assists += game.assists;
            }
        });
        return Array.from(stats.values());
    }

    /** Renders the main overall stats table */
    function renderOverallView() {
        overallContainer.innerHTML = '';
        const overallStats = calculateOverallStats(allPlayersList, allGamesData);

        // --- NEW: Default sort by goals (descending) ---
        overallStats.sort((a, b) => b.goals - a.goals);
        // ---------------------------------------------

        const headers = [
            { label: 'שם השחקן', key: 'name', sortable: true, isNumeric: false },
            { label: 'משחקים', key: 'games', sortable: true, isNumeric: true },
            { label: 'גולים', key: 'goals', sortable: true, isNumeric: true },
            { label: 'בישולים', key: 'assists', sortable: true, isNumeric: true }
        ];
        const table = createTable(overallStats, headers);
        overallContainer.appendChild(table);

        // --- NEW: Set initial sort indicator on 'goals' column ---
        setInitialSortIndicator(table, 'goals');
        // ---------------------------------------------------------
    }
    
    /** Renders by-game view, showing all players for each game */
    function renderByGameView() {
        byGameContainer.innerHTML = '';
        const groupedData = groupDataByDate(allGamesData);
        const headers = [
            { label: 'שם השחקן', key: 'name', sortable: true, isNumeric: false },
            { label: 'משחקים', key: 'games', sortable: true, isNumeric: true },
            { label: 'גולים', key: 'goals', sortable: true, isNumeric: true },
            { label: 'בישולים', key: 'assists', sortable: true, isNumeric: true }
        ];

        const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a));

        if (sortedDates.length === 0) {
            byGameContainer.innerHTML = '<p style="text-align:center; margin-top:20px;">לא נמצאו נתוני משחקים להצגה.</p>';
            return;
        }

        sortedDates.forEach(dateStr => {
            const gameDataForDate = groupedData[dateStr];
            
            let fullPlayerListForGame = allPlayersList.map(playerName => {
                const playerData = gameDataForDate.find(p => p.name === playerName);
                return playerData || { name: playerName, games: 0, goals: 0, assists: 0, date: dateStr };
            });

            // --- NEW: Default sort by goals (descending) for each game table ---
            fullPlayerListForGame.sort((a, b) => b.goals - a.goals);
            // -------------------------------------------------------------------

            const title = document.createElement('h2');
            title.className = 'game-title';
            const dateObj = new Date(dateStr);
            title.textContent = `משחק מתאריך ${dateObj.toLocaleDateString('he-IL')}`;
            byGameContainer.appendChild(title);
            
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';
            const table = createTable(fullPlayerListForGame, headers);
            tableContainer.appendChild(table);
            byGameContainer.appendChild(tableContainer);

            // --- NEW: Set initial sort indicator on 'goals' column for this table ---
            setInitialSortIndicator(table, 'goals');
            // ----------------------------------------------------------------------
        });
    }

    // --- Other functions (groupDataByDate, createTable, sortTable) remain the same ---
    function groupDataByDate(rawData) {
        const grouped = {};
        rawData.forEach(game => {
            if (!grouped[game.date]) {
                grouped[game.date] = [];
            }
            grouped[game.date].push(game);
        });
        return grouped;
    }

    function createTable(data, headers) {
        const table = document.createElement('table');
        const thead = table.createTHead();
        const tbody = table.createTBody();
        const headerRow = thead.insertRow();
        headers.forEach((header, index) => {
            const th = document.createElement('th');
            th.innerHTML = `<span class="sort-arrow"></span>${header.label}`;
            th.dataset.key = header.key;
            if (header.sortable) {
                th.classList.add('sortable');
                th.addEventListener('click', () => sortTable(table, index, header.isNumeric));
            }
            headerRow.appendChild(th);
        });
        data.forEach(item => {
            const row = tbody.insertRow();
            headers.forEach(header => {
                row.insertCell().textContent = item[header.key] !== undefined ? item[header.key] : 0;
            });
        });
        return table;
    }
    
    // --- NEW: Helper function to set the visual indicator for default sort ---
    function setInitialSortIndicator(table, key) {
        const headerCell = table.querySelector(`th[data-key="${key}"]`);
        if (headerCell) {
            headerCell.classList.add('sort-desc');
        }
    }
    // -------------------------------------------------------------------------

    function sortTable(table, colIndex, isNumeric) {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);
        const header = table.tHead.rows[0].cells[colIndex];
        const currentOrder = header.classList.contains('sort-asc') ? 'asc' : 'desc';
        const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        table.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
        header.classList.add(newOrder === 'asc' ? 'sort-asc' : 'sort-desc');
        rows.sort((a, b) => {
            let valA = a.cells[colIndex].textContent.trim();
            let valB = b.cells[colIndex].textContent.trim();
            if (isNumeric) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            if (valA < valB) return newOrder === 'asc' ? -1 : 1;
            if (valA > valB) return newOrder === 'asc' ? 1 : -1;
            return 0;
        });
        rows.forEach(row => tbody.appendChild(row));
    }

    // --- View Toggle Event Listeners ---
    overallBtn.addEventListener('click', () => {
        overallBtn.classList.add('active');
        byGameBtn.classList.remove('active');
        overallContainer.classList.remove('hidden');
        byGameContainer.classList.add('hidden');
    });

    byGameBtn.addEventListener('click', () => {
        byGameBtn.classList.add('active');
        overallBtn.classList.remove('active');
        byGameContainer.classList.remove('hidden');
        overallContainer.classList.add('hidden');
        if (!byGameViewRendered) {
            renderByGameView();
            byGameViewRendered = true; 
        }
    });
});