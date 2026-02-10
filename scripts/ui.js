export const UI = {
    // Render Inventory Configuration
    renderInventory(items) {
        const grid = document.getElementById('inventoryGrid');
        const emptyState = document.getElementById('emptyState');

        grid.innerHTML = '';

        if (items.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');

            const content = items.map(item => {
                // Fallback image logic
                const imgUrl = item.image && item.image.trim() !== ''
                    ? item.image
                    : 'https://placehold.co/300x200/png?text=No+Image';

                return `
                    <div class="item-card animate-in clickable" data-id="${item.id}">
                        <img src="${imgUrl}" alt="${item.name}" class="card-image">
                        <div class="card-content">
                            <div class="card-header">
                                <h3>${item.name}</h3>
                                <span class="badge ${item.category}">${this.getCategoryLabel(item.category)}</span>
                            </div>
                            <p class="card-brand">${item.brand}</p>
                            
                            <div class="card-footer" style="margin-top: auto;">
                                <span class="price" style="font-size: 1.25rem;">$${parseFloat(item.price).toFixed(2)}</span>
                                <span class="stock-label ${item.stock < 5 ? 'low-stock' : ''}" style="font-size: 0.9rem;">
                                    ${item.stock} un.
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = content;
        }
    },

    renderInventoryTable(items) {
        const tbody = document.getElementById('inventoryTableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.getElementById('inventoryTableContainer');

        // Always show container in table view, just show empty message in body if needed
        tableContainer.classList.remove('hidden');

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem;">No hay productos encontrados</td></tr>';
            emptyState.classList.add('hidden'); // Hide the generic empty state to show table empty state
        } else {
            emptyState.classList.add('hidden');

            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${item.name}</div>
                    </td>
                    <td>${item.brand}</td>
                    <td><span class="small-text">${item.description || '-'}</span></td>
                    <td style="color: var(--success); font-weight: 600;">$${parseFloat(item.price).toFixed(2)}</td>
                    <td class="cost-price">$${(item.cost || 0).toFixed(2)}</td>
                    <td>
                        <div class="stock-control">
                            <span class="stock-label ${item.stock < 5 ? 'low-stock' : ''}">${item.stock}</span>
                            <button class="action-btn sell-btn" data-id="${item.id}" title="Vender uno (-1)">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="action-btn edit-btn" data-id="${item.id}" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="action-btn delete-btn" data-id="${item.id}" title="Eliminar">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    },

    // Render Recent Items for Dashboard
    renderRecent(items) {
        const list = document.getElementById('recentList');
        if (!list) return;

        // Sort by date added (newest first) and take top 5
        const recentItems = [...items].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 5);

        list.innerHTML = '';
        if (recentItems.length === 0) {
            list.innerHTML = '<p class="text-muted">No items added yet.</p>';
        }

        recentItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'recent-item glass-panel';
            div.style.padding = '0.75rem';
            div.style.marginBottom = '0.5rem';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            div.innerHTML = `
                <div>
                    <strong>${item.name}</strong>
                    <br>
                    <small style="color: var(--text-secondary)">${this.getCategoryLabel(item.category)}</small>
                </div>
                <span style="font-weight: bold; color: var(--success)">$${parseFloat(item.price).toFixed(2)}</span>
            `;
            list.appendChild(div);
        });
    },

    updateStats(items) {
        const totalBooks = items.filter(i => i.category === 'book').length;
        const totalStationery = items.filter(i => i.category === 'stationery').length;
        const totalOther = items.filter(i => i.category === 'art' || i.category === 'office').length;
        const totalValue = items.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.stock)), 0);
        const lowStock = items.filter(i => i.stock < 5).length;
        const totalItems = items.length || 1; // Avoid division by zero

        this.animateValue("totalBooks", 0, totalBooks, 1000);
        this.animateValue("totalStationery", 0, totalStationery + totalOther, 1000); // Combining stationery+art for simpler stats or keep separate? 
        // Note: index.html has totalStationery, so maybe we map art there too or create new stat. 
        // For now sticking to ID logic.

        const totalValueElement = document.getElementById('totalValue');
        if (totalValueElement) {
            totalValueElement.textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        this.animateValue("lowStock", 0, lowStock, 1000);

        // Update Composition Bars
        const pctBooks = Math.round((totalBooks / totalItems) * 100);
        const pctStationery = Math.round((totalStationery / totalItems) * 100);
        const pctOther = Math.round((totalOther / totalItems) * 100);

        this.updateElement('pctBooks', `${pctBooks}%`);
        this.updateStyle('barBooks', 'width', `${pctBooks}%`);

        this.updateElement('pctStationery', `${pctStationery}%`);
        this.updateStyle('barStationery', 'width', `${pctStationery}%`);

        this.updateElement('pctOther', `${pctOther}%`);
        this.updateStyle('barOther', 'width', `${pctOther}%`);
    },

    updateElement(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    updateStyle(id, prop, value) {
        const el = document.getElementById(id);
        if (el) el.style[prop] = value;
    },

    // Helper for number animation
    animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if (!obj) return;

        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    getCategoryLabel(cat) {
        const map = {
            'book': 'Libro',
            'stationery': 'Papelería',
            'art': 'Arte',
            'office': 'Oficina'
        };
        return map[cat] || cat;
    },

    // --- Analytics Dashboard Methods ---

    populateCategoryFilter(categories) {
        // Populate Main Filter
        const select = document.getElementById('filterCategory');

        // List of all category dropdowns to populate
        const dropdowns = [
            select,
            document.getElementById('dashFilterCategory'),
            document.getElementById('dashFilterLowStockCat'),
            document.getElementById('dashFilterBestCat')
        ];

        dropdowns.forEach(dd => {
            if (!dd) return;
            dd.innerHTML = '<option value="all">Todas las Categorías</option>'; // Reset
            categories.forEach(cat => {
                const val = typeof cat === 'object' ? cat.name : cat;
                if (val === '__NEW__') return;

                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
                dd.appendChild(opt);
            });
        });

        // 2. Populate Modal Select
        const modalSelect = document.getElementById('itemCategorySelect');
        if (modalSelect) {
            modalSelect.innerHTML = '';

            // Standard Options
            if (categories.length > 0) {
                categories.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat;
                    opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                    modalSelect.appendChild(opt);
                });
            } else {
                // If no categories, add a placeholder or just the New option
                const opt = document.createElement('option');
                opt.value = "";
                opt.textContent = "-- Sin categorías --";
                opt.disabled = true;
                modalSelect.appendChild(opt);
            }

            // "Add New" Option
            const newOpt = document.createElement('option');
            newOpt.value = '__NEW__';
            newOpt.textContent = '+ Nueva Categoría...';
            newOpt.style.fontWeight = 'bold';
            newOpt.style.color = 'var(--primary-color)';
            modalSelect.appendChild(newOpt);
        }
    },

    renderDashboardAnalytics(inventory) {
        // 1. Populate Brands Filter
        const brandSelect = document.getElementById('dashFilterBrand');
        if (brandSelect && brandSelect.options.length <= 1) { // Only populate if mostly empty
            brandSelect.innerHTML = '<option value="all">Todas las Marcas</option>';
            const brands = [...new Set(inventory.map(i => i.brand))].sort();
            brands.forEach(b => {
                if (!b) return;
                const opt = document.createElement('option');
                opt.value = b;
                opt.textContent = b;
                brandSelect.appendChild(opt);
            });
        }

        // 2. Initial Renders
        this.updateTopStockTable(inventory);
        this.updateLowStockList(inventory);
        this.updateBestSellers(inventory);
        this.updateStats(inventory); // Keep existing stats
    },

    updateTopStockTable(inventory) {
        const catFilter = document.getElementById('dashFilterCategory') ? document.getElementById('dashFilterCategory').value : 'all';
        const brandFilter = document.getElementById('dashFilterBrand') ? document.getElementById('dashFilterBrand').value : 'all';

        let filtered = inventory.filter(i => {
            const matchCat = catFilter === 'all' || i.category === catFilter;
            const matchBrand = brandFilter === 'all' || i.brand === brandFilter;
            return matchCat && matchBrand;
        });

        // Sort by Stock DESC
        filtered.sort((a, b) => b.stock - a.stock);
        const top5 = filtered.slice(0, 5);

        const tbody = document.getElementById('topStockTable');
        if (!tbody) return;
        tbody.innerHTML = top5.map(item => `
            <tr>
                <td>${item.name}</td>
                <td><span class="badge ${item.category}">${this.getCategoryLabel(item.category)}</span></td>
                <td>${item.brand}</td>
                <td style="font-weight:bold; color: var(--success);">${item.stock}</td>
            </tr>
        `).join('');
    },

    updateLowStockList(inventory) {
        const catFilter = document.getElementById('dashFilterLowStockCat') ? document.getElementById('dashFilterLowStockCat').value : 'all';

        // Filter then Sort
        let filtered = inventory.filter(i => {
            if (catFilter !== 'all' && i.category !== catFilter) return false;
            return true; // No threshold, just lowest
        });

        const lowStock = filtered.sort((a, b) => a.stock - b.stock).slice(0, 5);
        const container = document.getElementById('lowStockList');
        if (!container) return;

        if (lowStock.length === 0) {
            container.innerHTML = '<li style="color: grey; padding: 0.5rem;">Todo en orden.</li>';
            return;
        }

        container.innerHTML = lowStock.map(item => `
            <li class="stock-item-row">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600;">${item.name}</span>
                    <small style="color: var(--text-secondary);">${item.brand}</small>
                </div>
                <span style="color: var(--danger); font-weight:bold;">${item.stock} un.</span>
            </li>
        `).join('');
    },

    updateBestSellers(inventory) {
        const catFilter = document.getElementById('dashFilterBestCat') ? document.getElementById('dashFilterBestCat').value : 'all';

        let filtered = inventory;
        if (catFilter !== 'all') {
            filtered = inventory.filter(i => i.category === catFilter);
        }

        // Sort by Sales DESC (mock property if missing)
        const sorted = [...filtered].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 3);
        const container = document.getElementById('bestSellersList');
        if (!container) return;

        if (sorted.length === 0) {
            container.innerHTML = '<div style="color:grey; padding:0.5rem">No data</div>';
            return;
        }

        container.innerHTML = sorted.map((item, index) => `
            <div class="best-seller-item" style="border-left-color: ${index === 0 ? 'gold' : index === 1 ? 'silver' : '#cd7f32'}">
                <div style="font-size: 1.5rem; font-weight: bold; width: 30px;">#${index + 1}</div>
                <div style="flex:1;">
                    <div style="font-weight:600;">${item.name}</div>
                    <small>${(item.sales || 0)} ventas</small>
                </div>
                <div style="font-weight:bold;">$${item.price.toFixed(2)}</div>
            </div>
        `).join('');
    },

    renderDetails(item) {
        if (!item) return;

        // Image
        const img = document.getElementById('detailImage');
        img.src = item.image && item.image.trim() !== ''
            ? item.image
            : 'https://placehold.co/600x400/png?text=No+Image';

        // Info
        document.getElementById('detailCategory').className = `badge ${item.category}`;
        document.getElementById('detailCategory').textContent = this.getCategoryLabel(item.category);
        document.getElementById('detailName').textContent = item.name;
        document.getElementById('detailBrand').textContent = item.brand;

        document.getElementById('detailPrice').textContent = `$${parseFloat(item.price).toFixed(2)}`;
        document.getElementById('detailCost').textContent = `Costo: $${(item.cost || 0).toFixed(2)}`;

        const stockEl = document.getElementById('detailStock');
        stockEl.textContent = item.stock;
        stockEl.style.color = item.stock < 5 ? 'var(--danger)' : 'var(--text-primary)';

        document.getElementById('detailDescription').textContent = item.description || 'No hay descripción disponible para este producto.';
        document.getElementById('detailId').textContent = item.id;

        // Update Buttons with ID
        document.getElementById('btnEditFromDetails').dataset.id = item.id;
        document.getElementById('btnDeleteFromDetails').dataset.id = item.id;
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        const icon = toast.querySelector('i');
        const span = document.getElementById('toastMessage');

        toast.className = `toast glass-panel show`;
        toast.style.borderLeftColor = type === 'success' ? 'var(--success)' : 'var(--danger)';
        if (icon) {
            icon.className = type === 'success' ? 'fa-solid fa-check-circle' : 'fa-solid fa-circle-exclamation';
            icon.style.color = type === 'success' ? 'var(--success)' : 'var(--danger)';
        }

        if (span) span.textContent = message;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000); // Increased timeout to read long messages
    }
};
