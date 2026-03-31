document.addEventListener('DOMContentLoaded', () => {
    const checkOneLineOnly = document.getElementById('checkOneLineOnly');
    const checkStrings = document.getElementById('checkStrings');
    const checkFull = document.getElementById('checkFull');

    checkOneLineOnly.addEventListener('change', (e) => {
        if (e.target.checked) {
            checkStrings.checked = false;
            checkFull.checked = false;
            
            checkStrings.disabled = true;
            checkFull.disabled = true;
        } else {
            checkStrings.disabled = false;
            checkFull.disabled = false;
            
        }
    });
});