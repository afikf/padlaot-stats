// The link to your deployed Google Apps Script.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxkgPNh4U78Vcx-ePb7rLkMY6rQhTKwJtq985wGSL-2F-tKiiSlOTSEr3452O9cZ7eu/exec";

document.addEventListener('DOMContentLoaded', () => {
    // Form Elements
    const form = document.getElementById('stats-form');
    const dateInput = document.getElementById('game-date');
    const playerNameSelect = document.getElementById('player-name');
    const gamesInput = document.getElementById('games');
    const goalsInput = document.getElementById('goals');
    const assistsInput = document.getElementById('assists');
    const submitButton = document.getElementById('submit-button');
    const dateError = document.getElementById('date-error');
    const responseMessage = document.getElementById('response-message');

    // --- Function to fetch existing data for a player and date ---
    const fetchExistingData = () => {
        const selectedDate = dateInput.value;
        const selectedPlayer = playerNameSelect.value;

        // Only fetch if both a player and a valid date are selected
        if (!selectedPlayer || !selectedDate || dateError.style.display === 'block') {
            return;
        }
        
        responseMessage.textContent = 'בודק נתונים קיימים...';
        responseMessage.style.color = '#7f8c8d';

        // Construct the URL with query parameters
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('name', selectedPlayer);
        url.searchParams.append('date', selectedDate);

        fetch(url)
            .then(res => res.json())
            .then(res => {
                responseMessage.textContent = ''; // Clear status message
                if (res.status === 'found') {
                    // Data exists, fill the form and change button text
                    gamesInput.value = res.data.games;
                    goalsInput.value = res.data.goals;
                    assistsInput.value = res.data.assists;
                    submitButton.textContent = 'עדכן נתונים';
                } else if (res.status === 'not_found') {
                    // No data exists, reset form to default and change button text
                    gamesInput.value = 1;
                    goalsInput.value = 0;
                    assistsInput.value = 0;
                    submitButton.textContent = 'שלח נתונים';
                } else {
                    throw new Error(res.message || 'Error fetching player data.');
                }
            })
            .catch(err => {
                console.error('Error checking for existing data:', err);
                responseMessage.textContent = `שגיאה בבדיקת נתונים: ${err.message}`;
                responseMessage.style.color = 'red';
            });
    };
    
    // --- Add Event Listeners ---
    dateInput.addEventListener('change', fetchExistingData);
    playerNameSelect.addEventListener('change', fetchExistingData);


    // --- Validation for Sundays only ---
    dateInput.addEventListener('input', () => {
        const [year, month, day] = dateInput.value.split('-').map(Number);
        const selectedDate = new Date(Date.UTC(year, month - 1, day));
        
        if (selectedDate.getUTCDay() !== 0) {
            dateError.style.display = 'block';
            submitButton.disabled = true;
        } else {
            dateError.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    // --- Fetch the list of players to populate the dropdown (on page load) ---
    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (data.players) {
                playerNameSelect.innerHTML = '<option value="">בחר את שמך...</option>';
                data.players.forEach(player => {
                    const option = document.createElement('option');
                    option.value = player;
                    option.textContent = player;
                    playerNameSelect.appendChild(option);
                });
            } else { throw new Error(data.error || 'Could not fetch players.'); }
        })
        .catch(error => {
            console.error('Error fetching players:', error);
            playerNameSelect.innerHTML = '<option value="">שגיאה בטעינת שחקנים</option>';
        });

    // --- Handle the form submission (POST request) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        submitButton.disabled = true;
        submitButton.textContent = 'שולח...';
        responseMessage.textContent = '';
        
        const formData = new FormData(form);
        const data = {
            date: formData.get('date'),
            name: formData.get('name'),
            games: parseInt(formData.get('games'), 10),
            goals: parseInt(formData.get('goals'), 10),
            assists: parseInt(formData.get('assists'), 10)
        };
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            // No Content-Type header to avoid CORS preflight issues with simple deployments
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                responseMessage.textContent = res.message;
                responseMessage.style.color = 'green';
                // Don't reset the form, so the user can see the data they submitted
            } else { throw new Error(res.message || 'An unknown error occurred.'); }
        })
        .catch(error => {
            responseMessage.textContent = `שגיאה: ${error.message}`;
            responseMessage.style.color = 'red';
        })
        .finally(() => {
            submitButton.disabled = false;
            // The text will be correct based on the last fetch
        });
    });
});
