/**
 * PDF Export Enhancement
 * Handles flowchart PDF generation
 */

function exportChainAsFlowchartPDF(chainData, totalLatency) {
    if (!chainData || chainData.length === 0) {
        return Promise.reject(new Error("Please add devices to the chain first"));
    }

    // Send to server
    return fetch('/api/export-flowchart-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            chain: chainData,
            total_latency: totalLatency
        })
    })
    .then(response => {
        if (!response.ok) throw new Error('PDF generation failed');
        return response.blob();
    })
    .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signal_chain_${new Date().getTime()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    })
    .catch(error => {
        console.error('PDF export error:', error);
        throw error;
    });
}

// Toast notification system
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || (() => {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
        return container;
    })();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        background: ${getToastColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastColor(type) {
    const colors = {
        success: '#51CF66',
        error: '#FF6B6B',
        warning: '#FFD43B',
        info: '#00D9FF'
    };
    return colors[type] || colors.info;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
