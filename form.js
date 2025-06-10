
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

    // --- Set max date to today ---
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    dateInput.setAttribute('max', maxDate);

    // --- Function to fetch existing data for a player and date ---
    const fetchExistingData = () => {
        const selectedDate = dateInput.value;
        const selectedPlayer = playerNameSelect.value;

        if (!selectedPlayer || !selectedDate || dateError.style.display === 'block') {
            return;
        }

        responseMessage.textContent = ''; // Clear any previous messages
        form.classList.add('loading'); // Visually disable the form and show overlay

        const url = new URL(SCRIPT_URL);
        url.searchParams.append('name', selectedPlayer);
        url.searchParams.append('date', selectedDate);

        fetch(url)
            .then(res => res.json())
            .then(res => {
                if (res.status === 'found') {
                    gamesInput.value = res.data.games;
                    goalsInput.value = res.data.goals;
                    assistsInput.value = res.data.assists;
                    submitButton.textContent = 'עדכן נתונים';
                } else if (res.status === 'not_found') {
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
            })
            .finally(() => {
                form.classList.remove('loading'); // Re-enable the form
            });
    };

    // --- Add Event Listeners ---
    // NEW: Use 'blur' event for date input to ensure the picker is closed.
    dateInput.addEventListener('blur', fetchExistingData);
    playerNameSelect.addEventListener('change', fetchExistingData);


    // --- Validation for Sundays only (on 'input' for immediate feedback) ---
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
        
        form.classList.add('loading');
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
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                responseMessage.textContent = res.message;
                responseMessage.style.color = 'green';
            } else { throw new Error(res.message || 'An unknown error occurred.'); }
        })
        .catch(error => {
            responseMessage.textContent = `שגיאה: ${error.message}`;
            responseMessage.style.color = 'red';
        })
        .finally(() => {
            form.classList.remove('loading');
            // Re-enable the submit button if needed, or leave as is if text changes
        });
    });
});