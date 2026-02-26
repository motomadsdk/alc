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
    const hearLatencyBtn = document.getElementById('hear-latency');
    const hearRefBtn = document.getElementById('hear-ref');
    const hearInfoBtn = document.getElementById('btn-hear-info');
    const hearInfoTooltip = document.getElementById('hear-info-tooltip');
    const exportJpgBtn = document.getElementById('export-jpg');

    // UI Elements
    const deviceLibraryEl = document.getElementById('device-library');
    const zoomSlider = document.getElementById('zoom-slider');

    // Disclaimer Modal Elements
    const disclaimerModal = document.getElementById('disclaimer-modal');
    const openDisclaimerBtn = document.getElementById('open-disclaimer');
    const closeDisclaimerBtn = document.getElementById('close-disclaimer');
    const ackDisclaimerBtn = document.getElementById('disclaimer-ack');

    // Suggest Device Modal Elements
    const suggestModal = document.getElementById('suggest-modal');
    const openSuggestBtn = document.getElementById('open-suggest');
    const closeSuggestBtn = document.getElementById('close-suggest');

    let allDevices = [];
    let currentChain = [];


    const MEASURED_SOURCE = '(moto measured)';
    const measuredIcon = `<img src="/static/images/measured.svg" class="measured-icon-file" alt="Measured">`;


    // ... (rest of init code) ...




    // Load chain from LocalStorage on startup
    const savedChain = localStorage.getItem('alc_chain');
    if (savedChain) {
        try {
            currentChain = JSON.parse(savedChain);
            // Migrate old flat chain to new structure
            currentChain = currentChain.map(item => {
                if (typeof item === 'object' && !item.type) {
                    item.type = 'device';
                }
                return item;
            });
        } catch (e) {
            console.error("Failed to load saved chain", e);
        }
    }



    // Helper to get protocol class for CSS
    const getProtocolClass = (type) => {
        if (!type) return 'default';
        const t = type.toLowerCase();
        if (t.includes('analog')) return 'analog';
        if (t.includes('aes50')) return 'aes50';
        if (t.includes('aes3') || t.includes('aes')) return 'aes3';
        if (t.includes('dante')) return 'dante';
        if (t.includes('avb')) return 'avb';
        if (t.includes('aes67')) return 'aes67';
        if (t.includes('optocore')) return 'optocore';
        if (t.includes('madi')) return 'madi';
        if (t.includes('digital')) return 'digital';
        return 'default';
    };

    // Helper for dual-protocol backgrounds
    function getProtocolBgHtml(inputType, outputType) {
        const inClass = getProtocolClass(inputType);
        const outClass = getProtocolClass(outputType);
        return `
            <div class="protocol-bg-container">
                <div class="bg-side left bg-${inClass}"></div>
                <div class="bg-side right bg-${outClass}"></div>
            </div>`;
    }

    // Helper to format sample rates (e.g. 48000 -> 48kHz)
    const formatSR = (sr) => {
        if (!sr || sr === '-') return '-';
        // If it's a number (or string that looks like a number)
        if (typeof sr === 'number' || (!isNaN(sr) && !sr.toString().includes('k'))) {
            const val = parseFloat(sr);
            if (val >= 1000) return (val / 1000) + 'kHz';
            return val + 'Hz';
        }
        return sr;
    };

    function getDeviceBadgesHtml(device) {
        // Fallback for technical data if missing from top-level (migration/consistency)
        const inputType = device.inputType || device.raw_data?.input_type || '-';
        const outputType = device.outputType || device.raw_data?.output_type || '-';
        const inputSR = formatSR(device.inputSR || device.raw_data?.input_sr || '-');
        const outputSR = formatSR(device.outputSR || device.raw_data?.output_sr || '-');

        const inClass = getProtocolClass(inputType);
        const outClass = getProtocolClass(outputType);

        const inputBadge = `
            <div class="badge-group ${inClass}">
                <span class="badge-label">In:</span>
                <span class="badge-value">${inputType}</span>
                ${inputSR !== '-' ? `<span class="badge-sr">${inputSR}</span>` : ''}
            </div>`;

        const outputBadge = `
            <div class="badge-group ${outClass}">
                <span class="badge-label">Out:</span>
                <span class="badge-value">${outputType}</span>
                ${outputSR !== '-' ? `<span class="badge-sr">${outputSR}</span>` : ''}
            </div>`;

        const portCountValue = `${device.raw_data?.input_count || device.inputCount || '2'} In / ${device.raw_data?.output_count || device.outputCount || '2'} Out`;
        const portCount = `
            <div class="badge-group ports">
                <span class="badge-label">Ports:</span>
                <span class="badge-value">${portCountValue}</span>
            </div>`;

        return `
            <div class="device-badges">
                <div class="badges-main">
                    <div class="badges-left">
                        ${inputBadge}
                    </div>
                    <div class="badges-right">
                        ${outputBadge}
                    </div>
                    ${device.display_time ? `<div class="device-latency">${device.display_time}</div>` : ''}
                </div>
                <div class="badges-footer">
                    ${portCount}
                </div>
            </div>`;
    }

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

    // Audio Latency Preview Logic
    if (hearLatencyBtn) {
        hearLatencyBtn.addEventListener('click', () => {
            const latencyStr = totalLatencyEl.textContent.replace(' ms', '').trim();
            const latency = parseFloat(latencyStr);

            if (isNaN(latency) || latency <= 0) {
                showToast("Add devices to hear the latency difference.", "warning");
                return;
            }

            // Visual feedback
            const originalHtml = hearLatencyBtn.innerHTML;
            hearLatencyBtn.innerHTML = `
                <svg class="spin" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                Generating...
            `;
            hearLatencyBtn.disabled = true;

            // Call backend API
            fetch(`/api/audio_preview?latency=${latency}`)
                .then(response => {
                    if (!response.ok) throw new Error("Audio generation failed");
                    return response.blob();
                })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.play();

                    // Restore button after playback starts (or with a small delay)
                    setTimeout(() => {
                        hearLatencyBtn.innerHTML = originalHtml;
                        hearLatencyBtn.disabled = false;
                    }, 1000);
                })
                .catch(err => {
                    console.error(err);
                    showToast("Failed to generate audio.", "error");
                    hearLatencyBtn.innerHTML = originalHtml;
                    hearLatencyBtn.disabled = false;
                });
        });
    }

    if (hearRefBtn) {
        hearRefBtn.addEventListener('click', () => {
            // Visual feedback
            const originalHtml = hearRefBtn.innerHTML;
            hearRefBtn.innerHTML = `<svg class="spin" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>`;
            hearRefBtn.disabled = true;

            fetch(`/api/audio_preview?latency=0`)
                .then(response => response.blob())
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.play();
                    setTimeout(() => {
                        hearRefBtn.innerHTML = originalHtml;
                        hearRefBtn.disabled = false;
                    }, 500);
                })
                .catch(err => {
                    console.error(err);
                    hearRefBtn.innerHTML = originalHtml;
                    hearRefBtn.disabled = false;
                });
        });
    }

    if (hearInfoBtn && hearInfoTooltip) {
        // Toggle for mobile, hover is handled by CSS
        hearInfoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hearInfoTooltip.classList.toggle('active');
        });

        // Close when clicking elsewhere
        window.addEventListener('click', () => {
            hearInfoTooltip.classList.remove('active');
        });
    }

    // Render Library
    function renderDeviceLibrary(devices) {
        deviceListEl.innerHTML = '';
        const contextContainer = document.getElementById('library-context-container');

        // Add Context Header
        const contextDevice = getContextDevice();
        let lastOutput = contextDevice ? (contextDevice.raw_data?.output_type || contextDevice.outputType) : null;
        let lastSR = contextDevice ? (contextDevice.raw_data?.output_sr || contextDevice.outputSR || '-') : '-';

        if (contextContainer) {
            contextContainer.innerHTML = '';
            const contextHeader = document.createElement('div');
            contextHeader.className = 'library-context-header';

            if (lastOutput) {
                const protoClass = getProtocolClass(lastOutput);
                contextHeader.innerHTML = `
                    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Req:</span>
                        <div class="context-tag matched ${protoClass}" style="padding: 2px 6px; font-size: 0.75rem;">${lastOutput}</div>
                        ${lastSR !== '-' ? `<div class="context-tag matched ${protoClass}" style="padding: 2px 6px; font-size: 0.75rem;">${formatSR(lastSR)}</div>` : ''}
                        <span style="font-size: 0.65rem; color: #666; font-style: italic; margin-left: auto;">(Sorted by match)</span>
                    </div>
                `;
            } else {
                contextHeader.innerHTML = `
                    <div style="font-size: 0.75rem; color: #888; text-align: center; padding: 4px;">Select a starting device or focus a path</div>
                `;
            }
            contextContainer.appendChild(contextHeader);
        }

        // Optional: Add a message if too many results
        if (devices.length > 100) {
            const warning = document.createElement('div');
            warning.className = 'limit-warning';
            warning.style.gridColumn = '1 / -1';
            warning.style.padding = '4px';
            warning.style.fontSize = '0.7rem';
            warning.style.color = '#888';
            warning.style.textAlign = 'center';
            warning.style.marginBottom = '8px';
            warning.innerText = `Showing 100 of ${devices.length}. Search for more.`;
            deviceListEl.appendChild(warning);
        }

        try {
            // Context already extracted above for header

            // Prepare devices with validity status
            const processedDevices = devices.map(device => {
                const rd = device.raw_data || {};
                const inputType = rd.input_type || '-';
                const inputSR = rd.input_sr || '-';

                let isValid = true;
                let statusMessage = '';

                if (lastOutput) {
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

                return {
                    ...device,
                    isValid,
                    statusMessage,
                    inputType,
                    inputSR,
                    outputType: rd.output_type || '-',
                    outputSR: rd.output_sr || '-'
                };
            });

            // Sort: Valid devices first
            processedDevices.sort((a, b) => {
                if (a.isValid && !b.isValid) return -1;
                if (!a.isValid && b.isValid) return 1;
                return 0;
            });

            // Group devices by Name (and Brand to be safe)
            const groupedDevicesMap = {};
            processedDevices.forEach(device => {
                const key = `${device.brand}-|-${device.name}`;
                if (!groupedDevicesMap[key]) {
                    groupedDevicesMap[key] = {
                        name: device.name,
                        brand: device.brand,
                        image: device.image,
                        source: device.source,
                        variants: [],
                        hasValid: false
                    };
                }
                groupedDevicesMap[key].variants.push(device);
                if (device.isValid) {
                    groupedDevicesMap[key].hasValid = true;
                }
            });

            // Convert to array and sort: groups with valid variants first
            let groupArray = Object.values(groupedDevicesMap);
            groupArray.sort((a, b) => {
                if (a.hasValid && !b.hasValid) return -1;
                if (!a.hasValid && b.hasValid) return 1;
                return 0; // Default sorting from previous layers will loosely preserve order
            });

            // Limit to top 100 to prevent DOM freeze
            const displayLimit = 100;
            const limitedGroups = groupArray.slice(0, displayLimit);

            // Store globally so the onchange handler can access them
            window.currentGroupedDevices = limitedGroups;

            limitedGroups.forEach((group, groupIndex) => {
                const card = document.createElement('div');
                card.className = 'device-card grouped-card';
                card.id = `group-card-${groupIndex}`;

                // Find the first valid variant to display by default
                let defaultVariantIdx = group.variants.findIndex(v => v.isValid);
                if (defaultVariantIdx === -1) defaultVariantIdx = 0; // fallback to the first one

                // Set initial state
                card.dataset.currentIndex = defaultVariantIdx;

                if (!group.variants[defaultVariantIdx].isValid) {
                    card.classList.add('dimmed');
                    card.title = group.variants[defaultVariantIdx].statusMessage;
                } else if (currentChain.length > 0) {
                    card.classList.add('recommended');
                }

                // Render the internal HTML of the card based on the selected variant index
                card.innerHTML = window.renderGroupCardInnerHtml(groupIndex, defaultVariantIdx);

                // Add to chain uses the explicitly selected variant
                card.onclick = () => {
                    const currentIdx = parseInt(card.dataset.currentIndex);
                    const selectedVariant = window.currentGroupedDevices[groupIndex].variants[currentIdx];
                    addToChain(selectedVariant, activeBranch);
                };

                deviceListEl.appendChild(card);
            });
        } catch (e) {
            console.error(e);
            alert("Render Error: " + e.message);
        }
    }

    // Expose the inner HTML renderer to the window so the select onchange can call it
    window.renderGroupCardInnerHtml = (groupIndex, variantIdx) => {
        const group = window.currentGroupedDevices[groupIndex];
        const variant = group.variants[variantIdx];

        // Dynamic Background Logic
        const bgHtml = getProtocolBgHtml(variant.inputType, variant.outputType);

        // Technical Badges
        const badgesHtml = getDeviceBadgesHtml(variant);

        // Source Link Logic
        let sourceDisplay = '';
        if (showSourceCheckbox.checked && group.source) {
            const url = sourceMappings[group.source];
            if (url) {
                sourceDisplay = `<a href="${url}" target="_blank" class="device-source link" title="${group.source} - Click to open documentation" onclick="event.stopPropagation()">${group.source} 🔗</a>`;
            } else {
                sourceDisplay = `<div class="device-source" title="${group.source}">${group.source}</div>`;
            }
        }

        // Measured Badge Overlay
        let measuredBadge = '';
        if (group.source === MEASURED_SOURCE) {
            measuredBadge = `<div class="measured-badge" title="Verified Measurement By MOTO">${measuredIcon}</div>`;
        }

        // Generate Dropdown for Variants
        let selectHtml = '';
        if (group.variants.length > 1) {
            // Extract unique Inputs and Outputs
            const uniqueInputs = [...new Set(group.variants.map(v => `${v.inputType}${v.inputSR !== '-' ? ' ' + formatSR(v.inputSR) : ''}`))];
            const uniqueOutputs = [...new Set(group.variants.map(v => `${v.outputType}${v.outputSR !== '-' ? ' ' + formatSR(v.outputSR) : ''}`))];

            // Current variant's Input and Output display strings
            const currentInStr = `${variant.inputType}${variant.inputSR !== '-' ? ' ' + formatSR(variant.inputSR) : ''}`;
            const currentOutStr = `${variant.outputType}${variant.outputSR !== '-' ? ' ' + formatSR(variant.outputSR) : ''}`;

            // User's explicitly attempted selection, if any
            const cardElement = document.getElementById(`group-card-${groupIndex}`);
            const explicitInStr = cardElement?.dataset.selectedInStr || currentInStr;
            const explicitOutStr = cardElement?.dataset.selectedOutStr || currentOutStr;

            // Get context requirements
            const requiredOut = window.lastOutput;
            const requiredSR = window.lastSR;
            const hasContext = !!requiredOut;

            const inOptions = uniqueInputs.map(inStr => {
                // Determine if this specific input string matches the required context
                let isOptionValid = true;
                if (hasContext) {
                    const [optType, optSR] = inStr.split(' ');
                    if (optType !== requiredOut) isOptionValid = false;
                    if (isOptionValid && requiredSR !== '-' && optSR && optSR !== formatSR(requiredSR) && optSR !== '-') {
                        isOptionValid = false;
                    }
                }

                // If we have a strict context, and this option doesn't match, we disable it
                const disabledAttr = (!isOptionValid && hasContext) ? 'disabled' : '';

                // If this is the currently actively selected variant's input, mark it selected
                // prioritizing the user's explicit choice
                const selectedAttr = (inStr === explicitInStr) ? 'selected' : '';

                return `<option value="${inStr}" ${selectedAttr} ${disabledAttr}>${inStr}${!isOptionValid && hasContext ? ' (Incompatible)' : ''}</option>`;
            }).join('');

            const outOptions = uniqueOutputs.map(outStr =>
                `<option value="${outStr}" ${outStr === explicitOutStr ? 'selected' : ''}>${outStr}</option>`
            ).join('');

            selectHtml = `
                <div class="variant-select-container dual-select">
                    <div class="select-wrapper">
                        <label>In</label>
                        <select class="variant-select dual-inp" onchange="window.updateGroupCardDual(${groupIndex}, this.value, this.parentElement.nextElementSibling.querySelector('select').value)" onclick="event.stopPropagation()">
                            ${inOptions}
                        </select>
                    </div>
                    <div class="select-wrapper">
                        <label>Out</label>
                        <select class="variant-select dual-out" onchange="window.updateGroupCardDual(${groupIndex}, this.parentElement.previousElementSibling.querySelector('select').value, this.value)" onclick="event.stopPropagation()">
                            ${outOptions}
                        </select>
                    </div>
                </div>
            `;
        } else {
            // Only one variant, no dropdown needed
            const v = variant;
            const inStr = `${v.inputType}${v.inputSR !== '-' ? ' ' + formatSR(v.inputSR) : ''}`;
            const outStr = `${v.outputType}${v.outputSR !== '-' ? ' ' + formatSR(v.outputSR) : ''}`;
            selectHtml = `
                <div class="variant-single-label">
                    In: ${inStr} ➔ Out: ${outStr}
                </div>
            `;
        }

        return `
            <div class="card-media">
                ${bgHtml}
                <img src="/static/images/${group.image}" alt="${group.name}" class="device-image" onload="this.style.opacity=1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="fallback-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" stroke-width="1" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="9" x2="12" y2="15"></line><line x1="9" y1="12" x2="15" y2="12"></line></svg>
                </div>
                ${measuredBadge}
            </div>
            <div class="card-content">
                <div class="device-title-container">
                    <div class="device-title">${group.name}</div>
                </div>
                <div class="card-controls-group">
                    ${selectHtml}
                    <div class="device-latency-wrapper" style="${sourceDisplay ? '' : 'display: none; margin-bottom: 0;'}">
                        ${sourceDisplay ? `<div style="margin-left: auto;">${sourceDisplay}</div>` : ''}
                    </div>
                    <div class="card-badges-wrapper">
                        ${badgesHtml}
                    </div>
                </div>
            </div>
        `;
    };

    window.updateGroupCardDual = (groupIndex, selectedInStr, selectedOutStr) => {
        const card = document.getElementById(`group-card-${groupIndex}`);
        if (!card) return;

        const group = window.currentGroupedDevices[groupIndex];

        // Find the variant that matches both In and Out if possible
        let foundVariantIdx = group.variants.findIndex(v => {
            const vInStr = `${v.inputType}${v.inputSR !== '-' ? ' ' + formatSR(v.inputSR) : ''}`;
            const vOutStr = `${v.outputType}${v.outputSR !== '-' ? ' ' + formatSR(v.outputSR) : ''}`;
            return vInStr === selectedInStr && vOutStr === selectedOutStr;
        });

        // Fallback: If exact combination doesn't exist, just find one that matches the Input
        if (foundVariantIdx === -1) {
            foundVariantIdx = group.variants.findIndex(v => {
                const vInStr = `${v.inputType}${v.inputSR !== '-' ? ' ' + formatSR(v.inputSR) : ''}`;
                return vInStr === selectedInStr;
            });
        }

        // Final Fallback: If STILL nothing matches (should rarely happen), stick to 0
        if (foundVariantIdx === -1) foundVariantIdx = 0;

        // Store explicit choices so dropdowns don't visually snap away
        card.dataset.selectedInStr = selectedInStr;
        card.dataset.selectedOutStr = selectedOutStr;

        // Update state
        card.dataset.currentIndex = foundVariantIdx;

        // Re-render inner HTML
        card.innerHTML = window.renderGroupCardInnerHtml(groupIndex, foundVariantIdx);

        // Re-evaluate validity for dimming entirely based on the newly selected variant
        const variant = group.variants[foundVariantIdx];
        if (!variant.isValid) {
            card.classList.add('dimmed');
            card.title = variant.statusMessage;
            card.classList.remove('recommended');
        } else {
            card.classList.remove('dimmed');
            card.title = '';
            if (currentChain.length > 0) {
                card.classList.add('recommended');
            }
        }
    };
    // Add to Chain
    function addToChain(device, branchPath = null) {
        const netCfg = device.network_config || { interfaces: [{ name: 'IP', protocol: '-', ip_type: '-' }] };
        const interfaces = netCfg.interfaces || [];
        const chainItem = {
            ...device,
            uniqueId: Date.now() + Math.random(),
            nickname: "",
            ips: new Array(interfaces.length).fill(""),
            ipLabels: interfaces.map(inf => inf.name),
            ipProtocols: interfaces.map(inf => inf.protocol), // Store protocols too
            ipTypes: interfaces.map(inf => inf.ip_type),     // Store types too
            type: 'device'
        };

        // Strict Validation Check
        const context = getContextDevice();
        if (context) {
            const compat = isCompatible(context, device);
            if (!compat.ok) {
                // Show custom modal instead of native alert
                const incModal = document.getElementById('incompatible-modal');
                const incMsg = document.getElementById('incompatible-message');
                if (incModal && incMsg) {
                    incMsg.innerHTML = `<strong>Incompatible:</strong><br><br>${compat.reason}<br><br><span style="font-size: 0.9em; opacity: 0.8;">Please choose a device with a matching protocol and sample rate.</span>`;
                    incModal.classList.add('active');
                }
                showToast(`Incompatible: ${compat.reason}`, 'error');
                return; // BLOCK ADDITION
            }
        }

        if (branchPath) {
            // branchPath is something like [splitUniqueId, branchIndex]
            const [splitId, branchIdx] = branchPath;
            const splitNode = findNodeInChain(currentChain, splitId);
            if (splitNode && splitNode.type === 'split') {
                splitNode.branches[branchIdx].push(chainItem);
            }
        } else {
            currentChain.push(chainItem);
        }

        saveChain();
        renderChain();
        filterDevices();
        showToast(`Added: ${device.name}`, 'success');

        if (getConsentStatus() === 'accepted') {
            trackEvent('add_to_chain', { device: device.name, brand: device.brand });
        }
    }

    function findNodeInChain(chain, uniqueId) {
        for (let node of chain) {
            if (node.uniqueId === uniqueId) return node;
            if (node.type === 'split') {
                for (let branch of node.branches) {
                    const found = findNodeInChain(branch, uniqueId);
                    if (found) return found;
                }
            }
        }
        return null;
    }

    function trackEvent(eventName, data) {
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: eventName,
                ...data,
                user_id: getUserID()
            })
        }).catch(err => console.warn("Tracking failed", err));
    }

    // Remove from Chain
    function removeFromChain(uniqueId) {
        currentChain = removeNodeFromChain(currentChain, uniqueId);
        saveChain();
        renderChain();
        filterDevices();
    }

    function removeNodeFromChain(chain, uniqueId) {
        let newChain = chain.filter(node => node.uniqueId !== uniqueId);
        newChain = newChain.map(node => {
            if (node.type === 'split') {
                const updatedBranches = node.branches.map(branch => removeNodeFromChain(branch, uniqueId));
                // If a split has only 0 or 1 valid branches with items, we could technically flatten it,
                // but let's keep it for now.
                return { ...node, branches: updatedBranches };
            }
            return node;
        });
        return newChain;
    }

    // Update Device Nickname
    function updateDeviceNickname(uniqueId, nickname) {
        const item = findNodeInChain(currentChain, uniqueId);
        if (item) {
            item.nickname = nickname;
            saveChain();
        }
    }

    function addNodeAfter(chain, uniqueId, newNode) {
        const index = chain.findIndex(n => n.uniqueId === uniqueId);
        if (index !== -1) {
            chain.splice(index + 1, 0, newNode);
            return true;
        }
        for (let node of chain) {
            if (node.type === 'split') {
                for (let branch of node.branches) {
                    if (addNodeAfter(branch, uniqueId, newNode)) return true;
                }
            }
        }
        return false;
    }

    // Split Path Logic
    function splitPathAt(uniqueId) {
        const item = findNodeInChain(currentChain, uniqueId);
        if (!item) return;

        const idx = currentChain.findIndex(n => n.uniqueId === uniqueId);
        if (idx === -1) return;

        // Discover ports from the device before the split
        const deviceBefore = getDeviceBeforeNode(currentChain, uniqueId);
        const availablePorts = getUniqueOutputs(deviceBefore);

        // Use the first port as default for all branches
        const defaultPort = availablePorts.length > 0 ? availablePorts[0] : null;

        const splitNode = {
            type: 'split',
            uniqueId: Date.now() + Math.random(),
            branches: [[], []],
            branchNames: { 0: 'Path A', 1: 'Path B' },
            portSelections: defaultPort ? { 0: defaultPort, 1: defaultPort } : {}
        };

        addNodeAfter(currentChain, uniqueId, splitNode);

        // Auto-select Path A of the new split
        activeBranch = [splitNode.uniqueId, 0];

        saveChain();
        renderChain();
        filterDevices();
        showToast("Signal Split Created", 'info');
    }

    function getUniqueOutputs(node) {
        if (!node || node.type !== 'device') return [];

        // Find all rows in allDevices matching this exact device-row (prefer stable id).
        const portMap = new Map();
        allDevices.forEach(d => {
            const sameRow = (d.id && node.id && d.id === node.id);

            // Fallback for old saved chains (no stable id stored yet)
            const dInput = d.raw_data?.input_type || d.inputType;
            const nodeInput = node.raw_data?.input_type || node.inputType;
            const fallbackMatch = (d.name === node.name && dInput === nodeInput);

            if (sameRow || fallbackMatch) {
                const outType = d.raw_data?.output_type || d.outputType || '-';
                const outSR = d.raw_data?.output_sr || d.outputSR || '-';
                const key = `${outType}-${outSR}`;
                if (!portMap.has(key)) {
                    portMap.set(key, {
                        type: outType,
                        sr: outSR,
                        latency: d.latency
                    });
                }
            }
        });
        return Array.from(portMap.values());
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
        try {
            return localStorage.getItem('alc_consent');
        } catch (e) {
            console.warn('localStorage access failed:', e);
            return 'auto-accepted'; // Assume acceptance if localStorage fails
        }
    }

    function initCookieBanner() {
        const status = getConsentStatus();
        const banner = document.getElementById('cookie-banner');

        // Ensure banner is never shown on initial load unless explicitly needed
        if (!banner) return;

        // Auto-accept on first visit - banner should NEVER show by default
        if (!status) {
            try {
                localStorage.setItem('alc_consent', 'auto-accepted');
            } catch (e) {
                console.warn('Could not save consent to localStorage');
            }
            banner.classList.remove('active');
            return;
        }

        // If status exists, make sure banner is hidden
        banner.classList.remove('active');

        const acceptBtn = document.getElementById('cookie-accept');
        const declineBtn = document.getElementById('cookie-decline');

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                try {
                    localStorage.setItem('alc_consent', 'accepted');
                    banner.classList.remove('active');
                    showToast("Preferences saved. Thank you!", "success");
                } catch (e) {
                    console.error('Failed to save consent:', e);
                    banner.classList.remove('active');
                }
            });
        }

        if (declineBtn) {
            declineBtn.addEventListener('click', () => {
                try {
                    localStorage.setItem('alc_consent', 'declined');
                    banner.classList.remove('active');
                    showToast("Preferences saved. Analytics disabled.", "info");
                } catch (e) {
                    console.error('Failed to save consent:', e);
                    banner.classList.remove('active');
                }
            });
        }
    }

    // CRITICAL: Ensure NO modals are active on page load
    document.querySelectorAll('.modal-overlay, .cookie-banner').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
        el.style.pointerEvents = 'none';
    });

    // Initialize Banner
    initCookieBanner();

    function removeBranch(splitId, branchIdx) {
        const splitNode = findNodeInChain(currentChain, splitId);
        if (splitNode && splitNode.branches.length > 2) {
            splitNode.branches.splice(branchIdx, 1);
            if (splitNode.portSelections) {
                delete splitNode.portSelections[branchIdx];
                // Shift other indices
                const newSelections = {};
                Object.keys(splitNode.portSelections).forEach(k => {
                    const ki = parseInt(k);
                    if (ki > branchIdx) newSelections[ki - 1] = splitNode.portSelections[k];
                    else newSelections[ki] = splitNode.portSelections[k];
                });
                splitNode.portSelections = newSelections;
            }
            // Also shift branchNames
            if (splitNode.branchNames) {
                const newNames = {};
                Object.keys(splitNode.branchNames).forEach(k => {
                    const ki = parseInt(k);
                    if (ki > branchIdx) newNames[ki - 1] = splitNode.branchNames[k];
                    else if (ki < branchIdx) newNames[ki] = splitNode.branchNames[k];
                });
                splitNode.branchNames = newNames;
            }
            saveChain();
            renderChain();
            filterDevices();
        }
    }

    window.updateBranchPort = (splitId, branchIdx, value) => {
        const splitNode = findNodeInChain(currentChain, splitId);
        if (splitNode) {
            const [type, sr] = value.split('|');
            const deviceBefore = getDeviceBeforeNode(currentChain, splitId);
            const ports = getUniqueOutputs(deviceBefore);
            const selectedPort = ports.find(p => p.type === type && p.sr === sr);

            if (selectedPort) {
                if (!splitNode.portSelections) splitNode.portSelections = {};
                splitNode.portSelections[branchIdx] = selectedPort;
                saveChain();
                renderChain();
                filterDevices();
                showToast(`Port for ${splitNode.branchNames?.[branchIdx] || 'Path'} updated`, 'success');
            }
        }
    };

    window.updateBranchName = (splitId, branchIdx, newName) => {
        const splitNode = findNodeInChain(currentChain, splitId);
        if (splitNode) {
            if (!splitNode.branchNames) splitNode.branchNames = {};
            splitNode.branchNames[branchIdx] = newName || `Path ${String.fromCharCode(65 + branchIdx)}`;
            saveChain();
            // Don't full re-render for every character if using oninput, 
            // but we need it for totals. Maybe use onchange.
            renderChain();
        }
    };

    window.removeBranch = removeBranch;

    // Recursive Render
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

        renderNodes(currentChain, signalChainEl);

        // --- Path Navigation Selector ---
        const navSelector = document.createElement('div');
        navSelector.className = 'path-navigation-selector';

        const hasBranching = currentChain.some(n => n.type === 'split');
        if (hasBranching) {
            navSelector.innerHTML = `
                <div class="nav-label">Building In:</div>
                <div class="nav-options">
                    <button class="nav-opt ${!activeBranch ? 'active' : ''}" id="nav-main-chain">Main Chain</button>
                    ${activeBranch ? `<button class="nav-opt active" id="nav-current-branch">Path: ${nodeNameForBranch(activeBranch)}</button>` : ''}
                </div>
            `;
            signalChainEl.prepend(navSelector);

            navSelector.querySelector('#nav-main-chain').onclick = () => {
                activeBranch = null;
                renderChain();
                filterDevices();
                showToast("Building in Main Chain", "info");
            };
        }

        // ALWAYS update totals after rendering
        updateTotal();

        signalChainEl.scrollTop = signalChainEl.scrollHeight;
    }

    function nodeNameForBranch(activePath) {
        if (!activePath) return "Main Chain";
        const [splitId, idx] = activePath;
        const splitNode = findNodeInChain(currentChain, splitId);
        if (!splitNode) return "Unknown Path";
        return splitNode.branchNames?.[idx] || `Path ${String.fromCharCode(65 + idx)}`;
    }

    function renderTopologyMap() {
        signalChainEl.innerHTML = '';
        const topologyWrapper = document.createElement('div');
        topologyWrapper.className = 'topology-wrapper';

        // In Topology Mode, we use isMini=true for ALL nodes, not just branches
        // But renderNodes handles this via the isMainChain flag usually.
        // Let's force mini nodes for topology.

        renderNodes(currentChain, topologyWrapper, true); // We'll update renderNodes to handle a global mini flag if needed
        signalChainEl.appendChild(topologyWrapper);
        updateTotal();
    }

    function renderNodes(nodes, container, isMainChain = true) {
        container.innerHTML = '';
        if (nodes.length === 0 && isMainChain) {
            container.innerHTML = '<div class="empty-state">No devices in chain. Search and click to add.</div>';
            return;
        }

        nodes.forEach((node, index) => {
            // Connector Logic
            if (index > 0 || !isMainChain) {
                const prev = index > 0 ? nodes[index - 1] : null;
                // If it's a branch, we might want a connector even for the first item
                // to show the connection from the split point.

                const arrow = document.createElement('div');
                arrow.className = 'chain-arrow-connector';

                if (prev && prev.type === 'device') {
                    const compat = isCompatible(prev, node);
                    const protocolName = prev.raw_data?.output_type || prev.outputType || 'default';
                    const protocolClass = getProtocolClass(protocolName);

                    arrow.classList.add('connector-' + protocolClass);
                    const wireColor = `var(--neon-${protocolClass}, var(--primary-color))`;

                    if (!compat.ok) {
                        arrow.classList.add('mismatch');
                        arrow.innerHTML = `
                            <div class="wire-vertical mismatch-wire" style="--wire-color: #ff4444;"></div>
                            <span class="arrow-symbol">⚠</span><span class="protocol-label">MISMATCH: ${compat.reason}</span>
                        `;
                    } else {
                        arrow.innerHTML = `
                            <div class="wire-vertical" style="--wire-color: ${wireColor};"></div>
                            <span class="arrow-symbol">→</span><span class="protocol-label">${protocolName}</span>
                        `;
                    }
                    container.appendChild(arrow);
                } else if (!prev && !isMainChain) {
                    // Visual link from the split point
                    arrow.classList.add('connector-branch-start');
                    container.appendChild(arrow);
                }
            }

            if (node.type === 'device') {
                // Mini nodes for branches
                const itemEl = createDeviceElement(node, !isMainChain);
                container.appendChild(itemEl);
            } else if (node.type === 'split') {
                const splitEl = createSplitElement(node);
                container.appendChild(splitEl);
            }
        });
    }

    function updateDeviceIP(uniqueId, index, ip) {
        const item = findNodeInChain(currentChain, uniqueId);
        if (item) {
            if (!item.ips) item.ips = [""];
            if (index < item.ips.length) {
                item.ips[index] = ip;
                saveChain();
            }
        }
    }

    function updateDeviceIPLabel(uniqueId, index, label) {
        const item = findNodeInChain(currentChain, uniqueId);
        if (item) {
            if (!item.ipLabels) item.ipLabels = ["IP"];
            if (index < item.ipLabels.length) {
                item.ipLabels[index] = label;
                saveChain();
            }
        }
    }

    function createDeviceElement(item, isMini = false) {
        const itemEl = document.createElement('div');
        itemEl.className = 'chain-item' + (isMini ? ' mini' : '');

        // Generate dynamically colored wires based on input protocol (coming IN)
        let wireColorIn = 'var(--primary-color)';
        const inProto = item.raw_data?.input_type || item.inputType;
        if (inProto && inProto !== '-') {
            wireColorIn = `var(--neon-${getProtocolClass(inProto)}, var(--primary-color))`;
        }

        // Generate dynamically colored wires based on output protocol (going OUT)
        let wireColorOut = 'var(--primary-color)';
        const outProto = item.raw_data?.output_type || item.outputType;
        if (outProto && outProto !== '-') {
            wireColorOut = `var(--neon-${getProtocolClass(outProto)}, var(--primary-color))`;
        }

        // Fallback for old data or mini items
        if (!item.ips) item.ips = [""];
        if (!item.ipLabels) item.ipLabels = ["IP"];

        itemEl.innerHTML = `
            ${!isMini ? `
                <div class="wire-vertical-top" style="--wire-color: ${wireColorIn};"></div>
                <div class="wire-vertical-bottom" style="--wire-color: ${wireColorOut};"></div>
                <div class="wire-horizontal" style="--wire-color: ${wireColorIn};"></div>
                <div class="wire-dot" style="--wire-color: ${wireColorIn};"></div>
            ` : ''}
            <div class="chain-item-top">
                <div class="chain-item-info">
                    <div class="chain-icon">
                        ${getProtocolBgHtml(item.raw_data?.input_type, item.raw_data?.output_type)}
                        <img src="/static/images/${item.image}" onload="this.style.opacity=1" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="chain-fallback">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle></svg>
                        </div>
                    </div>
                    <div class="chain-item-details">
                        <div class="name-container">
                            <input type="text" class="chain-item-nickname" value="${item.nickname || item.name}" placeholder="Label..." title="Click to rename">
                            ${!isMini ? `<span class="chain-item-model">${item.nickname ? item.name : ''}</span>` : ''}
                        </div>
                        <div class="chain-item-technical">
                            ${getDeviceBadgesHtml(item)}
                        </div>
                    </div>
                </div>
                
                <div class="chain-item-actions">
                    ${!isMini ? `
                    <button class="split-btn" title="Split Path Here">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M7 11v 8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v8"/><path d="M17 11v 8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V1a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v8"/></svg>
                    </button>` : ''}
                    <button class="remove-btn">×</button>
                </div>
            </div>
            
            ${!isMini ? `
            <div class="chain-item-network">
                <button class="network-toggle-btn" title="Show Network Config">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" class="network-icon"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    Network Info
                </button>
                <div class="network-dropdown" style="display: none;">
                    <div class="ip-grid">
                        ${item.ips.map((ip, idx) => `
                            <div class="ip-entry">
                                <div class="ip-label-wrap">
                                    <input type="text" class="ip-label-input" data-index="${idx}" value="${item.ipLabels[idx]}" placeholder="Label...">
                                    <div class="ip-meta">
                                        ${item.ipProtocols?.[idx] && item.ipProtocols[idx] !== '-' ? `<span class="ip-protocol">${item.ipProtocols[idx]}</span>` : ''}
                                        ${item.ipTypes?.[idx] && item.ipTypes[idx] !== '-' ? `<span class="ip-type">${item.ipTypes[idx]}</span>` : ''}
                                    </div>
                                </div>
                                <input type="text" class="ip-input" data-index="${idx}" value="${ip}" placeholder="0.0.0.0">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Print-only network info -->
            <div class="print-network-info">
                <div class="print-ip-list">
                    ${(item.ips || []).map((ip, idx) => ip ? `
                        <div class="print-ip-item">
                            <strong>${item.ipLabels[idx]}${item.ipProtocols?.[idx] && item.ipProtocols[idx] !== '-' ? ` (${item.ipProtocols[idx]})` : ''}:</strong> ${ip}
                        </div>
                    ` : '').join('')}
                </div>
            </div>
        `;

        itemEl.querySelector('.chain-item-nickname').onchange = (e) => updateDeviceNickname(item.uniqueId, e.target.value);

        if (!isMini) {
            itemEl.querySelector('.split-btn').onclick = () => splitPathAt(item.uniqueId);

            // Network Toggle
            const netToggle = itemEl.querySelector('.network-toggle-btn');
            const netDropdown = itemEl.querySelector('.network-dropdown');
            netToggle.onclick = () => {
                const isHidden = netDropdown.style.display === 'none';
                netDropdown.style.display = isHidden ? 'block' : 'none';
                netToggle.classList.toggle('active', isHidden);
            };

            // IP Inputs & Label Inputs
            itemEl.querySelectorAll('.ip-input').forEach(input => {
                input.onchange = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    updateDeviceIP(item.uniqueId, idx, e.target.value);
                };
            });

            itemEl.querySelectorAll('.ip-label-input').forEach(input => {
                input.onchange = (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    updateDeviceIPLabel(item.uniqueId, idx, e.target.value);
                };
            });
        }

        itemEl.querySelector('.remove-btn').onclick = () => removeFromChain(item.uniqueId);

        return itemEl;
    }

    function createSplitElement(node) {
        const splitEl = document.createElement('div');
        splitEl.className = 'splitter-node-container'; // Changed from splitter-node for layout
        splitEl.innerHTML = `
            <div class="splitter-hub">
                <div class="splitter-label">Signal Split</div>
                <div class="splitter-technical-info">Distributing signal...</div>
                <button class="remove-btn" title="Remove Split">×</button>
            </div>
            <div class="parallel-paths"></div>
            <div class="splitter-footer">
                <button class="add-branch-btn">+ Add Output Path</button>
            </div>
        `;

        const pathsContainer = splitEl.querySelector('.parallel-paths');
        const deviceBefore = getDeviceBeforeNode(currentChain, node.uniqueId);
        const availablePorts = getUniqueOutputs(deviceBefore);

        node.branches.forEach((branch, idx) => {
            const branchContainer = document.createElement('div');
            branchContainer.className = 'branch-container';
            const branchLatency = calculatePathLatency(branch, node, idx);
            const isBranchActive = activeBranch && activeBranch[0] === node.uniqueId && activeBranch[1] === idx;

            if (isBranchActive) branchContainer.classList.add('focused');

            // Port Selector HTML
            let portSelectorHtml = '';
            if (availablePorts.length > 1) {
                const currentPort = node.portSelections?.[idx];
                const options = availablePorts.map(p => `
                    <option value="${p.type}|${p.sr}" ${currentPort?.type === p.type && currentPort?.sr === p.sr ? 'selected' : ''}>
                        ${p.type} ${p.sr !== '-' ? `(${p.sr})` : ''}
                    </option>
                `).join('');

                portSelectorHtml = `
                    <div class="branch-port-selector" title="Select output port for this path">
                        <label>Port:</label>
                        <select onchange="updateBranchPort('${node.uniqueId}', ${idx}, this.value)">
                            ${options}
                        </select>
                    </div>
                `;
            } else if (availablePorts.length === 1) {
                const p = availablePorts[0];
                portSelectorHtml = `<div class="branch-port-info">${p.type} ${p.sr !== '-' ? `(${p.sr})` : ''}</div>`;
            }

            const branchName = node.branchNames?.[idx] || `Path ${String.fromCharCode(65 + idx)}`;

            branchContainer.innerHTML = `
                <div class="branch-header ${isBranchActive ? 'active' : ''}" style="cursor: pointer;">
                    <div class="branch-technical">
                        <input type="text" class="branch-title-input" value="${branchName}" 
                               onchange="updateBranchName('${node.uniqueId}', ${idx}, this.value)"
                               placeholder="Path Name" onclick="event.stopPropagation()">
                        <span class="branch-latency">${branchLatency.toFixed(2)} ms</span>
                    </div>
                    ${portSelectorHtml}
                    <div class="branch-actions">
                        <button class="select-branch-btn" title="${isBranchActive ? 'Currently building this path' : 'Focus this path to add devices'}">
                            ${isBranchActive ? 'BUILDING HERE' : 'FOCUS PATH'}
                        </button>
                        ${branch.length === 0 && node.branches.length > 2 ? `<button class="remove-branch-btn" onclick="removeBranch('${node.uniqueId}', ${idx})" title="Remove Branch">×</button>` : ''}
                    </div>
                </div>
            `;

            // Entire header is now a focus trigger
            branchContainer.querySelector('.branch-header').onclick = () => {
                activeBranch = [node.uniqueId, idx];
                renderChain();
                filterDevices();
                showToast(`Focused on ${branchName}`, "info");
            };

            if (branch.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'empty-branch-placeholder';
                emptyEl.innerHTML = `
                    <div class="placeholder-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 5v14M5 12h14"/></svg>
                    </div>
                    <span>Empty Path - Building Mode</span>
                `;
                branchContainer.appendChild(emptyEl);
            } else {
                renderNodes(branch, branchContainer, false);
            }

            pathsContainer.appendChild(branchContainer);
        });

        splitEl.querySelector('.add-branch-btn').onclick = (e) => {
            e.stopPropagation();
            const newIdx = node.branches.length;
            node.branches.push([]);
            if (!node.branchNames) node.branchNames = {};
            const newName = `Path ${String.fromCharCode(65 + newIdx)}`;
            node.branchNames[newIdx] = newName;
            if (node.portSelections && node.portSelections[0]) {
                node.portSelections[newIdx] = { ...node.portSelections[0] };
            }
            // AUTO-FOCUS the new path
            activeBranch = [node.uniqueId, newIdx];

            saveChain();
            renderChain();
            showToast(`${newName} Added & Focused`, 'success');
        };

        splitEl.querySelector('.remove-btn').onclick = (e) => {
            e.stopPropagation();
            removeFromChain(node.uniqueId);
        };

        return splitEl;
    }

    let activeBranch = null;

    function calculatePathLatency(nodes, parentSplit = null, branchIdx = null) {
        let total = 0;

        // Add port latency if this is a calculation for a specific branch start
        if (parentSplit && branchIdx !== null && parentSplit.portSelections?.[branchIdx]) {
            total += parentSplit.portSelections[branchIdx].latency;
        }

        nodes.forEach(node => {
            if (node.type === 'device') total += node.latency;
            else if (node.type === 'split') {
                total += Math.max(...node.branches.map((b, i) => calculatePathLatency(b, node, i)));
            }
        });
        return total;
    }

    function getLastDeviceInList(list) {
        if (!list || list.length === 0) return null;
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].type === 'device') return list[i];
        }
        return null;
    }

    function getDeviceBeforeNode(chain, uniqueId, parentContext = null) {
        let currentContext = parentContext;
        for (let i = 0; i < chain.length; i++) {
            const node = chain[i];
            if (node.uniqueId === uniqueId) return currentContext;
            if (node.type === 'device') {
                currentContext = node;
            } else if (node.type === 'split') {
                for (let branch of node.branches) {
                    const found = getDeviceBeforeNode(branch, uniqueId, currentContext);
                    if (found !== undefined) return found;
                }
            }
        }
        return undefined;
    }

    function getContextDevice() {
        if (!activeBranch) return getLastDeviceInList(currentChain);
        const [splitId, branchIdx] = activeBranch;
        const splitNode = findNodeInChain(currentChain, splitId);
        if (!splitNode || splitNode.type !== 'split') return null;

        const branch = splitNode.branches[branchIdx];
        if (branch.length > 0) return getLastDeviceInList(branch);

        const portSelection = splitNode.portSelections?.[branchIdx];
        const deviceBefore = getDeviceBeforeNode(currentChain, splitId);
        if (portSelection && deviceBefore) {
            return {
                ...deviceBefore,
                outputType: portSelection.type,
                outputSR: portSelection.sr,
                raw_data: {
                    ...(deviceBefore.raw_data || {}),
                    output_type: portSelection.type,
                    output_sr: portSelection.sr
                }
            };
        }
        return deviceBefore;
    }

    function getAllPathTotals(nodes, baseLatency = 0) {
        let common = 0;
        let splits = [];
        nodes.forEach(node => {
            if (node.type === 'device') {
                common += node.latency;
            } else if (node.type === 'split') {
                node.branches.forEach((branch, idx) => {
                    const branchPaths = getAllPathTotals(branch, 0);
                    const branchName = node.branchNames?.[idx] || `Path ${String.fromCharCode(65 + idx)}`;
                    branchPaths.forEach(bp => {
                        splits.push({
                            label: bp.label ? `${branchName} ➔ ${bp.label}` : branchName,
                            latency: bp.latency
                        });
                    });
                });
            }
        });
        if (splits.length === 0) return [{ label: '', latency: baseLatency + common }];
        return splits.map(s => ({
            label: s.label,
            latency: baseLatency + common + s.latency
        }));
    }

    function updateTotal() {
        if (currentChain.length === 0) {
            totalLatencyEl.innerHTML = '<span class="total-value">0.00 ms</span>';
            return;
        }
        const pathTotals = getAllPathTotals(currentChain);
        let newValueHtml = '';
        if (pathTotals.length === 1 && pathTotals[0].label === '') {
            newValueHtml = `<span class="total-value">${pathTotals[0].latency.toFixed(2)} ms</span>`;
        } else {
            let html = '<div class="path-results-list">';
            pathTotals.forEach(p => {
                html += `
                    <div class="path-result-item">
                        <span class="path-result-label">${p.label}</span>
                        <span class="path-result-value">${p.latency.toFixed(2)} ms</span>
                    </div>`;
            });
            html += '</div>';
            newValueHtml = html;
        }

        // Only animate if value changed
        if (totalLatencyEl.innerHTML !== newValueHtml) {
            totalLatencyEl.innerHTML = newValueHtml;
            totalLatencyEl.classList.remove('latency-update-anim');
            void totalLatencyEl.offsetWidth; // Trigger reflow
            totalLatencyEl.classList.add('latency-update-anim');
        }
    }

    function isCompatible(source, target) {
        if (!source || !target) return { ok: true };

        const outProtocol = source.raw_data?.output_type || source.outputType;
        const outSR = source.raw_data?.output_sr || source.outputSR;
        const inProtocol = target.raw_data?.input_type || target.inputType;
        const inSR = target.raw_data?.input_sr || target.inputSR;

        if (!outProtocol || !inProtocol) return { ok: true };

        const protocolMatch = outProtocol === inProtocol;
        const srMatch = (outSR === '-' || inSR === '-' || outSR === inSR);

        if (!protocolMatch) return { ok: false, reason: `${outProtocol} ➔ ${inProtocol}` };
        if (!srMatch) return { ok: false, reason: `SR ${outSR} ➔ ${inSR}` };

        return { ok: true };
    }

    function filterDevices() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedBrand = brandFilter.value;
        const sortType = sortSelect ? sortSelect.value : 'popularity';
        const context = getContextDevice();

        let filtered = allDevices.filter(d => {
            const matchesSearch = d.name.toLowerCase().includes(searchTerm) ||
                (d.raw_data?.input_type?.toLowerCase().includes(searchTerm)) ||
                (d.raw_data?.output_type?.toLowerCase().includes(searchTerm));
            const matchesBrand = selectedBrand === "" || d.brand === selectedBrand;

            return matchesSearch && matchesBrand;
        });
        filtered.sort((a, b) => {
            if (sortType === 'name_asc') return a.name.localeCompare(b.name);
            if (sortType === 'name_desc') return b.name.localeCompare(a.name);
            if (sortType === 'latency_asc') return a.latency - b.latency;
            if (sortType === 'latency_desc') return b.latency - a.latency;
            return 0;
        });
        renderDeviceLibrary(filtered);
    }

    searchInput.addEventListener('input', filterDevices);
    brandFilter.addEventListener('change', filterDevices);
    if (sortSelect) sortSelect.addEventListener('change', filterDevices);
    if (showSourceCheckbox) {
        showSourceCheckbox.addEventListener('change', () => filterDevices());
    }

    const toggleLibraryBtn = document.getElementById('toggle-library');
    if (toggleLibraryBtn) {
        toggleLibraryBtn.onclick = () => {
            const library = document.querySelector('.device-library');
            library.classList.toggle('collapsed');

            // Adjust smooth scroll or layout if needed
            setTimeout(() => {
                if (typeof renderChain === 'function') renderChain();
            }, 500); // Wait for transition
        };
    }

    // Zoom Slider Logic
    if (zoomSlider && deviceListEl) {
        // Base width 160px allows comfortably fitting 4 per row inside the 800px max-width library
        const baseWidth = 160;
        zoomSlider.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            const newWidth = Math.max(160, Math.round(baseWidth * scale));
            deviceListEl.style.setProperty('--grid-item-min-width', `${newWidth}px`);
        });

        // Trigger initial update based on HTML default value
        zoomSlider.dispatchEvent(new Event('input'));
    }



    clearBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the entire chain?")) {
            currentChain = [];
            saveChain();
            renderChain();
            renderDeviceLibrary(allDevices);
            showToast('Chain Cleared', 'info');
        }
    });

    exportBtn.addEventListener('click', () => {
        if (currentChain.length === 0) {
            showToast("Signal chain is empty. Add devices before exporting.", "warning");
            return;
        }

        // Get the total latency value
        const totalLatencyEl = document.getElementById('total-latency');
        const totalLatencyText = totalLatencyEl ? totalLatencyEl.textContent : '0';
        const totalLatency = parseFloat(totalLatencyText.replace(/[^0-9.]/g, '')) || 0;

        // Show loading state
        const originalText = exportBtn.textContent;
        exportBtn.textContent = '⏳ Generating...';
        exportBtn.disabled = true;

        // Use the new flowchart PDF export function
        exportChainAsFlowchartPDF(currentChain, totalLatency)
            .then(() => {
                showToast("PDF exported successfully! 📊", "success");
                exportBtn.textContent = originalText;
                exportBtn.disabled = false;
            })
            .catch(error => {
                console.error('PDF export error:', error);
                showToast("Failed to export PDF: " + error.message, "error");
                exportBtn.textContent = originalText;
                exportBtn.disabled = false;
            });
    });

    if (exportJpgBtn) {
        exportJpgBtn.addEventListener('click', () => {
            if (currentChain.length === 0) {
                showToast("Signal chain is empty", "warning");
                return;
            }

            const target = document.getElementById('signal-chain');
            if (!target) return;

            showToast("Generating Image...", "info");

            // Temporary styles for better capture if needed
            const originalBackground = target.style.background;
            target.style.background = '#121212'; // Ensure dark background

            html2canvas(target, {
                backgroundColor: '#121212',
                scale: 2, // Higher quality
                logging: false,
                useCORS: true
            }).then(canvas => {
                target.style.background = originalBackground;

                const link = document.createElement('a');
                link.download = `MOTO-Signal-Flow-Overview-${new Date().getTime()}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.click();

                showToast("Overview Map exported", "success");
            }).catch(err => {
                console.error("Export failed", err);
            });
        });
    }

    // Custom Incompatible Modal Logic
    const incModal = document.getElementById('incompatible-modal');
    const closeIncBtn = document.getElementById('close-incompatible');
    const okIncBtn = document.getElementById('btn-incompatible-ok');

    if (incModal) {
        const closeIncModal = () => incModal.classList.remove('active');
        if (closeIncBtn) closeIncBtn.addEventListener('click', closeIncModal);
        if (okIncBtn) okIncBtn.addEventListener('click', closeIncModal);

        // Close on outside click
        incModal.addEventListener('click', (e) => {
            if (e.target === incModal) closeIncModal();
        });
    }

    // Disclaimer Modal Logic
    if (openDisclaimerBtn && disclaimerModal) {
        openDisclaimerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            disclaimerModal.classList.add('active');
        });
    }

    const closeDisclaimer = () => {
        if (disclaimerModal) disclaimerModal.classList.remove('active');
    };

    if (closeDisclaimerBtn) closeDisclaimerBtn.addEventListener('click', closeDisclaimer);
    if (ackDisclaimerBtn) ackDisclaimerBtn.addEventListener('click', closeDisclaimer);

    // Suggest Device Modal Logic
    if (openSuggestBtn && suggestModal) {
        openSuggestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            suggestModal.classList.add('active');
        });
    }

    const closeSuggest = () => {
        if (suggestModal) suggestModal.classList.remove('active');
    };

    if (closeSuggestBtn) closeSuggestBtn.addEventListener('click', closeSuggest);

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === disclaimerModal) {
            closeDisclaimer();
        }
        if (e.target === suggestModal) {
            closeSuggest();
        }
    });

    // Mobile Warning Close Logic
    const closeMobileWarningBtn = document.getElementById('close-mobile-warning');
    const mobileWarningBanner = document.getElementById('mobile-warning');
    if (closeMobileWarningBtn && mobileWarningBanner) {
        closeMobileWarningBtn.addEventListener('click', () => {
            mobileWarningBanner.style.display = 'none';
        });
    }

    // Global Network Config Toggle
    const globalNetworkToggle = document.getElementById('global-network-enable');
    const signalChainContainer = document.getElementById('signal-chain'); // Applies variable filtering down to nodes

    // Ensure network is hidden by default
    if (signalChainContainer) {
        signalChainContainer.classList.add('global-network-disabled');
    }

    if (globalNetworkToggle && signalChainContainer) {
        globalNetworkToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                signalChainContainer.classList.remove('global-network-disabled');
                showToast("Network Configurations Enabled", "info");
            } else {
                signalChainContainer.classList.add('global-network-disabled');
                showToast("Network Configurations Hidden", "info");
            }
        });
    }

    // Global Ports Toggle
    const globalPortsToggle = document.getElementById('global-ports-enable');

    // Ensure ports are hidden by default
    if (document.body) {
        document.body.classList.add('global-ports-disabled');
    }

    if (globalPortsToggle) {
        globalPortsToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.remove('global-ports-disabled');
                showToast("Port Numbers Shown", "info");
            } else {
                document.body.classList.add('global-ports-disabled');
                showToast("Port Numbers Hidden", "info");
            }
        });
    }
});
