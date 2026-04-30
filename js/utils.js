/**
 * Finance Obsidian - Utilities
 * Shared helper functions for formatting and UI feedback
 */

/**
 * Formats a number as BRL currency string
 * @param {number} value 
 * @returns {string}
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to BR format (DD/MM/YYYY)
 * @param {string} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Applies a currency mask to an input element
 * @param {HTMLInputElement} input 
 */
export function formatCurrencyInput(input) {
    let value = input.value.replace(/\D/g, '');
    value = (value / 100).toFixed(2) + '';
    value = value.replace(".", ",");
    value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    input.value = "R$ " + value;
}

/**
 * Parses a masked currency string back to a number
 * @param {string} value 
 * @returns {number}
 */
export function parseCurrency(value) {
    if (!value) return 0;
    return parseFloat(value.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
}

/**
 * Displays a toast notification
 * @param {string} message 
 * @param {'success' | 'error' | 'info'} type 
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '🔔'}</span>
        <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 4s
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
