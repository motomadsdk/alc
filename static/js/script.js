document.addEventListener('DOMContentLoaded', () => {
    const deviceListEl = document.getElementById('device-list');
    const signalChainEl = document.getElementById('signal-chain');
    const totalLatencyEl = document.getElementById('total-latency');
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-chain');
    const exportBtn = document.getElementById('export-pdf');
    const brandFilter = document.getElementById('brand-filter');
    const showSourceCheckbox = document.getElementById('show-source');

    let allDevices = [];
    let currentChain = [];

    // ... (fetch logic remains same, skipping for brevity in replacement if not needed, but here I need to replace block) ... 
    // Actually, let's keep it simple and just do targeted replacements.

    // 1. Add const
    // 2. Update renderDeviceLibrary
    // 3. Add listener

    // I will use multiple ReplaceFileContent calls or a single one if contiguous. They are not contiguous.
    // I will use multi_replace_file_content.


    // Fetch data from API
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            allDevices = data;
            populateBrandFilter(allDevices);
            renderDeviceLibrary(allDevices);
        })
        .catch(error => console.error('Error fetching data:', error));

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
            // Helper to get protocol class
            const getProtocolClass = (type) => {
                if (!type) return 'default';
                const t = type.toLowerCase();
                if (t.includes('analog')) return 'analog';
                if (t.includes('aes3') || t.includes('aes')) return 'aes3';
                if (t.includes('dante')) return 'dante';
                if (t.includes('avb')) return 'avb';
                return 'default';
            };

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

                card.innerHTML = `
                    <div class="card-media">
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
                        ${showSourceCheckbox.checked ? `<div class="device-source" title="${device.source}">${device.source}</div>` : ''}
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
        renderChain();
        renderDeviceLibrary(allDevices);
    }

    // Remove from Chain
    function removeFromChain(uniqueId) {
        currentChain = currentChain.filter(item => item.uniqueId !== uniqueId);
        renderChain();
        renderDeviceLibrary(allDevices);
    }

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
        const getProtocolClass = (type) => {
            if (!type) return 'default';
            const t = type.toLowerCase();
            if (t.includes('analog')) return 'analog';
            if (t.includes('aes3') || t.includes('aes')) return 'aes3';
            if (t.includes('dante')) return 'dante';
            if (t.includes('avb')) return 'avb';
            return 'default';
        };

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
                arrow.innerHTML = `<span class="arrow-symbol">↓</span><span class="protocol-label">${protocolName}</span>`;

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
                   <div class="chain-icon">
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
    function filterDevices() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedBrand = brandFilter.value;

        const filtered = allDevices.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchTerm) ||
                (d.raw_data.input_type && d.raw_data.input_type.toLowerCase().includes(searchTerm)) ||
                (d.raw_data.output_type && d.raw_data.output_type.toLowerCase().includes(searchTerm));

            const matchesBrand = selectedBrand === "" || d.brand === selectedBrand;

            return matchesSearch && matchesBrand;
        });

        renderDeviceLibrary(filtered);
    }

    // Event Listeners
    searchInput.addEventListener('input', filterDevices);
    brandFilter.addEventListener('change', filterDevices);
    showSourceCheckbox.addEventListener('change', filterDevices);

    // Clear Chain
    clearBtn.addEventListener('click', () => {
        currentChain = [];
        renderChain();
        renderDeviceLibrary(allDevices);
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
