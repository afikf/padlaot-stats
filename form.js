// ===================================================================
// == הדבק כאן את הקישור שקיבלת מהפריסה של GOOGLE APPS SCRIPT    ==
// ===================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxkgPNh4U78Vcx-ePb7rLkMY6rQhTKwJtq985wGSL-2F-tKiiSlOTSEr3452O9cZ7eu/exec";
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('stats-form');
    const dateInput = document.getElementById('game-date');
    const dateError = document.getElementById('date-error');
    const playerNameSelect = document.getElementById('player-name');
    const submitButton = document.getElementById('submit-button');
    const responseMessage = document.getElementById('response-message');

    // --- Validation for Sundays only ---
    dateInput.addEventListener('input', () => {
        // The value is read as a string 'YYYY-MM-DD'. The Date object constructor
        // can parse this, but it will be in the user's local timezone.
        // We'll use UTC methods to avoid timezone shift issues.
        const [year, month, day] = dateInput.value.split('-').map(Number);
        const selectedDate = new Date(Date.UTC(year, month - 1, day));
        
        // getUTCDay() returns 0 for Sunday, 1 for Monday, etc.
        if (selectedDate.getUTCDay() !== 0) {
            dateError.style.display = 'block';
            submitButton.disabled = true;
        } else {
            dateError.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    // --- Fetch the list of players to populate the dropdown ---
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

    // --- Handle the form submission ---
    form.addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        submitButton.disabled = true;
        submitButton.textContent = 'שולח...';
        responseMessage.textContent = '';
        
        const formData = new FormData(form);
        const data = {
            date: formData.get('date'), // NEW: send the selected date
            name: formData.get('name'),
            games: parseInt(formData.get('games'), 10),
            goals: parseInt(formData.get('goals'), 10),
            assists: parseInt(formData.get('assists'), 10)
        };
        
        fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json', },
            redirect: 'follow',
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                responseMessage.textContent = res.message;
                responseMessage.style.color = 'green';
                form.reset();
            } else { throw new Error(res.message || 'An unknown error occurred.'); }
        })
        .catch(error => {
            responseMessage.textContent = `שגיאה: ${error.message}`;
            responseMessage.style.color = 'red';
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'שלח נתונים';
        });
    });
});
