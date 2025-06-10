document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================
    // == ודא שזה הקישור לגיליון "הזנת נתונים - משחקים"            ==
    // ===================================================================
    const RAW_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjSHec_HTnsbDypeWhzQZalUoOGvuPFsUhzung3nnM8cj9vIfeCgWf4KakONdwXC36XOQQ8ZuAwPlN/pub?gid=1634847815&single=true&output=csv';

    // DOM Elements
    const loader = document.getElementById('loader');
    const lastUpdated = document.getElementById('last-updated');
    const overallContainer = document.getElementById('overall-view-container');
    const byGameContainer = document.getElementById('by-game-view-container');
    const overallBtn = document.getElementById('overall-view-btn');
    const byGameBtn = document.getElementById('by-game-view-btn');

    let allGamesData = [];

    console.log("DEBUG: Script loaded. Starting fetch...");

    fetch(RAW_DATA_URL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response failed. Status: ${response.status}`);
            }
            console.log("DEBUG: Fetch successful. Reading CSV text...");
            return response.text();
        })
        .then(csvText => {
            console.log("DEBUG: CSV text received. Length:", csvText.length);
            if (csvText.length < 50) {
                console.warn("DEBUG: CSV data seems very short. Here it is:", csvText);
            }
            
            loader.style.display = 'none';
            const rows = csvText.trim().split('\n').slice(1);
            console.log(`DEBUG: Found ${rows.length} data rows after splitting CSV.`);

            allGamesData = rows.map((row, index) => {
                const cells = row.split(',');
                
                // Debug log for each row
                if(index < 5) { // Log first 5 rows to avoid spamming console
                     console.log(`DEBUG: Parsing row ${index + 1}:`, cells);
                }

                if (cells.length < 6) {
                    console.warn(`DEBUG: Skipping malformed row ${index + 1}. Expected 6 cells, got ${cells.length}. Row content:`, row);
                    return null;
                }
                
                const [date, name, hasPlayed, games, goals, assists] = cells;
                
                if (!hasPlayed || hasPlayed.trim().toLowerCase() !== 'true') {
                    // This is expected, so we don't log it as an error
                    return null;
                }

                return {
                    date: new Date(date.trim()).toISOString().split('T')[0],
                    name: name.trim(),
                    games: parseInt(games, 10) || 0,
                    goals: parseInt(goals, 10) || 0,
                    assists: parseInt(assists, 10) || 0
                };
            }).filter(Boolean); // Remove null entries

            console.log(`DEBUG: Successfully parsed ${allGamesData.length} valid game entries.`);

            if (allGamesData.length === 0) {
                throw new Error("No valid data was found in the spreadsheet. Please check the 'hasPlayed' column is set to TRUE for some entries.");
            }

            renderOverallView();
            lastUpdated.textContent = `עודכן לאחרונה: ${new Date().toLocaleDateString('he-IL')}`;
        })
        .catch(error => {
            console.error('FINAL ERROR:', error);
            loader.style.display = 'none';
            lastUpdated.textContent = `שגיאה בטעינת הנתונים: ${error.message}`;
            lastUpdated.style.color = 'red';
        });

    // --- All other functions (calculate, group, render, sort) remain the same ---
    
    function calculateOverallStats(rawData) {
        const stats = new Map();
        rawData.forEach(game => {
            if (!stats.has(game.name)) {
                stats.set(game.name, { games: 0, goals: 0, assists: 0 });
            }
            const current = stats.get(game.name);
            current.games += game.games;
            current.goals += game.goals;
            current.assists += game.assists;
        });
        return Array.from(stats, ([name, data]) => ({ name, ...data }));
    }

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
                row.insertCell().textContent = item[header.key] || 0;
            });
        });
        
        return table;
    }

    function renderOverallView() {
        overallContainer.innerHTML = '';
        const overallStats = calculateOverallStats(allGamesData);
        const headers = [
            { label: 'שם השחקן', key: 'name', sortable: true, isNumeric: false },
            { label: 'משחקים', key: 'games', sortable: true, isNumeric: true },
            { label: 'גולים', key: 'goals', sortable: true, isNumeric: true },
            { label: 'בישולים', key: 'assists', sortable: true, isNumeric: true }
        ];
        const table = createTable(overallStats, headers);
        overallContainer.appendChild(table);
    }
    
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

        sortedDates.forEach(dateStr => {
            const gameData = groupedData[dateStr];
            const title = document.createElement('h2');
            title.className = 'game-title';
            const dateObj = new Date(dateStr);
            title.textContent = `משחק מתאריך ${dateObj.toLocaleDateString('he-IL')}`;
            byGameContainer.appendChild(title);
            const tableContainer = document.createElement('div');
            tableContainer.className = 'table-container';
            const table = createTable(gameData, headers);
            tableContainer.appendChild(table);
            byGameContainer.appendChild(tableContainer);
        });
    }

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
        if (byGameContainer.innerHTML === '') {
            renderByGameView();
        }
    });
});
