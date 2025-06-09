// The link to your Google Sheet CSV.
const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjSHec_HTnsbDypeWhzQZalUoOGvuPFsUhzung3nnM8cj9vIfeCgWf4KakONdwXC36XOQQ8ZuAwPlN/pub?gid=188811576&single=true&output=csv';

document.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
    const table = document.getElementById('league-table');
    const tableHead = table.querySelector('thead');
    const tableBody = table.querySelector('tbody');
    const lastUpdated = document.getElementById('last-updated');

    // This function builds the table from CSV text
    function populateTable(csvText) {
        // Hide loader and show table
        loader.classList.add('hidden');
        table.classList.remove('hidden');

        const rows = csvText.trim().split('\n');

        // Clear previous data if any
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Create table headers from the first row of the CSV
        const headerRow = document.createElement('tr');
        const headers = rows[0].split(',');
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText.trim();
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        // Create data rows from the second row onwards
        for (let i = 1; i < rows.length; i++) {
            // Skip empty rows
            if (rows[i].trim() === '') continue;

            const dataRow = document.createElement('tr');
            const cells = rows[i].split(',');

            cells.forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText.trim();
                dataRow.appendChild(td);
            });

            tableBody.appendChild(dataRow);
        }
    }

    // Try to fetch real data
    fetch(sheetUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(csvText => {
            // Success! Populate table with real data
            populateTable(csvText);
            // Update the timestamp
            const now = new Date();
            lastUpdated.textContent = `עודכן לאחרונה: ${now.toLocaleDateString('he-IL')} ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
        })
        .catch(error => {
            // Fetch failed, show an error message.
            console.error('Error fetching or parsing data:', error);
            loader.style.display = 'none'; // Hide the animation
            lastUpdated.innerHTML = 'אופס! קרתה שגיאה בטעינת הנתונים מהשרת של גוגל.<br>אנא בדוק את הקישור או נסה לרענן.';
            lastUpdated.style.color = 'red';
        });
});
