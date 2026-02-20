document.addEventListener('DOMContentLoaded', () => {


    const deviceListEl = document.getElementById('device-list');
    const signalChainEl = document.getElementById('signal-chain');
    const totalLatencyEl = document.getElementById('total-latency');
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-chain');
    const exportBtn = document.getElementById('export-pdf');
    const brandFilter = document.getElementById('brand-filter');
    const sortSelect = document.getElementById('sort-select');
    const showSourceCheckbox = document.getElementById('show-source');

    let allDevices = [];
    let currentChain = [];

    // Protocol Code Mapping for Background Images
    function getProtocolCode(type) {
        if (!type) return 'unknown';
        const t = type.toLowerCase();
        if (t.includes('analog')) return 'ana';
        if (t.includes('aes3')) return 'aes';
        if (t.includes('dante')) return 'dante';
        if (t.includes('avb')) return 'avb';
        if (t.includes('aes67')) return 'aes67';
        if (t.includes('optocore')) return 'opto';
        if (t.includes('madi')) return 'madi';
        if (t.includes('digital')) return 'dig';
        return 'unknown';
    }

    // ... (rest of init code) ...




    // Load chain from LocalStorage on startup
    const savedChain = localStorage.getItem('alc_chain');
    if (savedChain) {
        try {
            currentChain = JSON.parse(savedChain);
            // Ensure uniqueIds are unique if copying causing issues, but load should be fine
        } catch (e) {
            console.error("Failed to load saved chain", e);
        }
    }



    // Helper to get protocol class for CSS
    const getProtocolClass = (type) => {
        if (!type) return 'default';
        const t = type.toLowerCase();
        if (t.includes('analog')) return 'analog';
        if (t.includes('aes3') || t.includes('aes')) return 'aes3';
        if (t.includes('dante')) return 'dante';
        if (t.includes('avb')) return 'avb';
        if (t.includes('aes67')) return 'aes67';
        if (t.includes('optocore')) return 'optocore';
        if (t.includes('madi')) return 'madi';
        if (t.includes('digital')) return 'digital';
        return 'default';
    };

    // Fetch data and sources
    let sourceMappings = {};

    Promise.all([
        fetch('/api/data').then(res => res.json()),
        fetch('/api/sources').then(res => res.json())
    ]).then(([data, sources]) => {
        allDevices = data;
        sourceMappings = sources || {};
        populateBrandFilter(allDevices);
        renderDeviceLibrary(allDevices);
        renderChain();
    }).catch(error => console.error('Error fetching data:', error));

    // Toast Notification System
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease-in forwards';
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    function saveChain() {
        localStorage.setItem('alc_chain', JSON.stringify(currentChain));
    }

    function populateBrandFilter(devices) {
        const brands = new Set(devices.map(d => d.brand).filter(b => b !== "Unknown"));
        const sortedBrands = Array.from(brands).sort();

        sortedBrands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
    }

    // Render Library
    function renderDeviceLibrary(devices) {
        deviceListEl.innerHTML = '';

        // Optional: Add a message if too many results
        if (devices.length > 100) {
            const warning = document.createElement('div');
            warning.className = 'limit-warning';
            warning.style.gridColumn = '1 / -1';
            warning.style.padding = '10px';
            warning.style.color = '#888';
            warning.style.textAlign = 'center';
            warning.innerText = `Showing top 100 of ${devices.length} devices. Use search to find specific models.`;
            deviceListEl.appendChild(warning);
        }

        try {
            // Determine last output type in chain
            let lastOutput = null;
            let lastSR = '-';

            if (currentChain.length > 0) {
                const lastDevice = currentChain[currentChain.length - 1];
                lastOutput = lastDevice.raw_data.output_type;
                lastSR = lastDevice.raw_data.output_sr || '-';
            }

            // Prepare devices with validity status
            const processedDevices = devices.map(device => {
                const inputType = device.raw_data.input_type || '-';
                const inputSR = device.raw_data.input_sr || '-';
                const outputSR = device.raw_data.output_sr || '-';

                let isValid = true;
                let statusMessage = '';

                if (currentChain.length > 0 && lastOutput) {
                    // Rule 1: Input Type match
                    if (inputType !== lastOutput) {
                        isValid = false;
                        statusMessage = `Requires ${lastOutput} Input`;
                    }

                    // Rule 2: Sample Rate match
                    if (isValid && lastSR !== '-' && inputSR !== '-') {
                        if (lastSR !== inputSR) {
                            isValid = false;
                            statusMessage = `SR Mismatch: ${lastSR} vs ${inputSR}`;
                        }
                    }
                }

                return { ...device, isValid, statusMessage, inputType, inputSR, outputSR };
            });

            // Sort: Valid devices first, then original order
            if (currentChain.length > 0) {
                processedDevices.sort((a, b) => {
                    if (a.isValid && !b.isValid) return -1;
                    if (!a.isValid && b.isValid) return 1;
                    return 0;
                });
            }

            // Limit to top 100 to prevent DOM freeze
            const displayLimit = 100;
            const limitedDevices = processedDevices.slice(0, displayLimit);

            limitedDevices.forEach(device => {
                const card = document.createElement('div');
                card.className = 'device-card';

                if (!device.isValid) {
                    card.classList.add('dimmed'); // Visual dimming
                    card.title = device.statusMessage;
                } else {
                    if (currentChain.length > 0) {
                        card.classList.add('recommended'); // Highlight valid next steps
                    }
                }

                // Background Image Logic
                const inCode = getProtocolCode(device.inputType);
                const outCode = getProtocolCode(device.raw_data.output_type);
                const bgImage = `url('/static/images/${inCode}_to_${outCode}.png')`;

                // Allow adding any device (user freedom)
                card.addEventListener('click', () => addToChain(device));

                const inClass = getProtocolClass(device.inputType);
                const outClass = getProtocolClass(device.raw_data.output_type);

                const inputBadge = `<span class="badge ${inClass}">In: ${device.inputType}</span>`;
                const outputBadge = `<span class="badge ${outClass}">Out: ${device.raw_data.output_type || '?'}</span>`;

                let srText = '';
                if (device.inputSR !== '-' && device.outputSR !== '-' && device.inputSR !== device.outputSR) {
                    srText = `${device.inputSR} -> ${device.outputSR}`;
                } else if (device.inputSR !== '-') {
                    srText = device.inputSR;
                } else if (device.outputSR !== '-') {
                    srText = device.outputSR;
                }

                const srBadge = srText ? `<span class="badge state sr">${srText}</span>` : '';

                // Source Link Logic
                let sourceDisplay = '';
                if (showSourceCheckbox.checked && device.source) {
                    const url = sourceMappings[device.source];
                    if (url) {
                        sourceDisplay = `<a href="${url}" target="_blank" class="device-source link" title="${device.source} - Click to open documentation" onclick="event.stopPropagation()">${device.source} 🔗</a>`;
                    } else {
                        sourceDisplay = `<div class="device-source" title="${device.source}">${device.source}</div>`;
                    }
                }

                card.innerHTML = `
                    <div class="card-media" style="background-image: ${bgImage}; background-size: cover; background-position: center;">
                        <img src="/static/images/${device.image}" alt="${device.name}" onload="this.style.opacity=1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                         <div class="fallback-icon">
                            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="9" x2="12" y2="15"></line><line x1="9" y1="12" x2="15" y2="12"></line></svg>
                        </div>
                    </div>
                    <div class="card-content">
                        <div class="device-latency">${device.display_time}</div>
                        <div class="device-title-container">
                            <div class="device-part">${device.name}</div>
                        </div>
                        ${sourceDisplay}
                        <div class="device-badges">
                            ${inputBadge}
                            ${outputBadge}
                            ${srBadge}
                        </div>
                    </div>
                `;
                deviceListEl.appendChild(card);
            });
        } catch (e) {
            console.error(e);
            alert("Render Error: " + e.message);
        }
    }

    // Add to Chain
    function addToChain(device) {
        const chainItem = { ...device, uniqueId: Date.now() + Math.random() };
        currentChain.push(chainItem);
        saveChain(); // Save
        renderChain();
        renderChain();
        filterDevices(); // Re-filter to update validity/recommended status
        showToast(`Added: ${device.name}`, 'success');

        // Track Event (if allowed)
        if (getConsentStatus() === 'accepted') {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'add_to_chain',
                    device: device.name,
                    brand: device.brand,
                    user_id: getUserID()
                })
            }).catch(err => console.warn("Tracking failed", err));
        }
    }

    // Remove from Chain
    function removeFromChain(uniqueId) {
        currentChain = currentChain.filter(item => item.uniqueId !== uniqueId);
        saveChain(); // Save
        renderChain();
        filterDevices(); // Re-filter to update validity/recommended status
    }

    // --- Analytics & Consent ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function getUserID() {
        let uid = localStorage.getItem('alc_user_id');
        if (!uid) {
            uid = generateUUID();
            localStorage.setItem('alc_user_id', uid);
        }
        return uid;
    }

    function getConsentStatus() {
        return localStorage.getItem('alc_consent');
    }

    function initCookieBanner() {
        const status = getConsentStatus();
        const banner = document.getElementById('cookie-banner');

        if (!status) {
            banner.style.display = 'block';
        }

        document.getElementById('cookie-accept').addEventListener('click', () => {
            localStorage.setItem('alc_consent', 'accepted');
            banner.style.display = 'none';
            showToast("Preferences saved. Thank you!", "success");
        });

        document.getElementById('cookie-decline').addEventListener('click', () => {
            localStorage.setItem('alc_consent', 'declined');
            banner.style.display = 'none';
            showToast("Preferences saved. Analytics disabled.", "info");
        });
    }

    // Initialize Banner
    initCookieBanner();

    // Render Chain
    function renderChain() {
        signalChainEl.innerHTML = '';

        if (currentChain.length === 0) {
            signalChainEl.innerHTML = `
                <div class="empty-state">
                    <p>Drag or click devices from the library to add them here.</p>
                </div>`;
            updateTotal();
            return;
        }

        // Helper for chain items
        // (getProtocolClass is now global)

        currentChain.forEach((item, index) => {
            // Add arrow if not first item
            if (index > 0) {
                const prev = currentChain[index - 1];
                const arrow = document.createElement('div');
                arrow.className = 'chain-arrow-connector';

                // Show protocol on arrow
                const protocolName = prev.raw_data.output_type || 'default';
                const protocolClass = getProtocolClass(protocolName);

                arrow.classList.add('connector-' + protocolClass);
                arrow.innerHTML = `<span class="arrow-symbol">→</span><span class="protocol-label">${protocolName}</span>`;

                signalChainEl.appendChild(arrow);
            }

            const itemEl = document.createElement('div');
            itemEl.className = 'chain-item';

            // Check validity with previous if exists (visual warning)
            if (index > 0) {
                const prev = currentChain[index - 1];
                if (prev.raw_data.output_type !== item.raw_data.input_type) {
                    itemEl.classList.add('chain-error');
                }
            }

            const inClass = getProtocolClass(item.raw_data.input_type);
            const outClass = getProtocolClass(item.raw_data.output_type);

            const inputBadge = `<span class="badge ${inClass}">In: ${item.raw_data.input_type || '-'}</span>`;
            const outputBadge = `<span class="badge ${outClass}">Out: ${item.raw_data.output_type || '?'}</span>`;

            let srText = '';
            const iSR = item.raw_data.input_sr || '-';
            const oSR = item.raw_data.output_sr || '-';

            if (iSR !== '-' && oSR !== '-' && iSR !== oSR) {
                srText = `${iSR} -> ${oSR}`;
            } else if (iSR !== '-') {
                srText = iSR;
            } else if (oSR !== '-') {
                srText = oSR;
            }

            const srBadge = srText ? `<span class="badge state sr">${srText}</span>` : '';

            itemEl.innerHTML = `
                <div class="chain-item-info">
                   <div class="chain-icon" style="background-image: url('/static/images/${getProtocolCode(item.raw_data.input_type)}_to_${getProtocolCode(item.raw_data.output_type)}.png'); background-size: cover; background-position: center;">
                        <img src="/static/images/${item.image}" onload="this.style.opacity=1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="chain-fallback">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle></svg>
                        </div>
                   </div>
                    <div class="chain-item-details">
                        <span class="chain-item-name">${item.name}</span>
                        <div class="chain-meta">
                            <span class="chain-item-latency">${item.display_time}</span>
                            ${inputBadge} ${outputBadge} ${srBadge}
                        </div>
                    </div>
                </div>
                <button class="remove-btn">×</button>
            `;

            itemEl.querySelector('.remove-btn').onclick = () => removeFromChain(item.uniqueId);

            signalChainEl.appendChild(itemEl);
        });

        signalChainEl.scrollTop = signalChainEl.scrollHeight;
        updateTotal();
    }

    // Calculate Total
    function updateTotal() {
        let total = 0;
        currentChain.forEach(item => {
            total += item.latency;
        });
        totalLatencyEl.textContent = total.toFixed(2) + ' ms';
    }

    // Unified Filter Function
    // Unified Filter & Sort Function
    function filterDevices() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedBrand = brandFilter.value;
        const sortType = sortSelect ? sortSelect.value : 'popularity';

        // 1. Filter
        let filtered = allDevices.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchTerm) ||
                (d.raw_data.input_type && d.raw_data.input_type.toLowerCase().includes(searchTerm)) ||
                (d.raw_data.output_type && d.raw_data.output_type.toLowerCase().includes(searchTerm));

            const matchesBrand = selectedBrand === "" || d.brand === selectedBrand;

            return matchesSearch && matchesBrand;
        });

        // 2. Sort
        filtered.sort((a, b) => {
            if (sortType === 'name_asc') return a.name.localeCompare(b.name);
            if (sortType === 'name_desc') return b.name.localeCompare(a.name);
            if (sortType === 'latency_asc') return a.latency - b.latency;
            if (sortType === 'latency_desc') return b.latency - a.latency;
            // Default: Popularity (Server order preserved)
            return 0;
        });

        renderDeviceLibrary(filtered);
    }

    // Event Listeners
    searchInput.addEventListener('input', filterDevices);
    brandFilter.addEventListener('change', filterDevices);
    if (sortSelect) sortSelect.addEventListener('change', filterDevices);

    if (showSourceCheckbox) {
        showSourceCheckbox.addEventListener('change', () => {
            filterDevices();
        });
    }

    // Clear Chain
    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the entire chain?")) {
            currentChain = [];
            saveChain(); // Save
            renderChain();
            renderDeviceLibrary(allDevices);
            showToast('Chain Cleared', 'info');
        }
    });

    // Export PDF
    exportBtn.addEventListener('click', () => {
        if (currentChain.length === 0) {
            alert("Signal chain is empty. Add devices before exporting.");
            return;
        }
        window.print();
    });
});
