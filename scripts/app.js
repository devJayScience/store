import { Storage } from './storage.js';
import { UI } from './ui.js';

// App State
let currentInventory = [];
let isEditing = false;
let editingId = null;
let currentViewMode = 'table'; // Default to table as per user preference

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('storage-loaded', () => {
        loadData();
        checkUrlParams();
    });

    // Load data from Supabase
    loadData().then(data => {
        console.log('Data loaded successfully:', data);
        checkUrlParams();
    }).catch(err => {
        console.error('Failed to load data:', err);
        UI.showToast('Error cargando datos: ' + err.message, 'error');
    });

    setupEventListeners();
});

// --- FUNCIÓN DE ALERTA PERSONALIZADA (NUEVA) ---
// --- FUNCIÓN DE ALERTA PERSONALIZADA (MEJORADA) ---
const showCustomAlert = (title, message, type = 'success', showCancel = false) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const iconEl = document.getElementById('alertIcon');
        const titleEl = document.getElementById('alertTitle');
        const msgEl = document.getElementById('alertMessage');
        const btnConfirm = document.getElementById('btnAlertConfirm');
        const btnCancel = document.getElementById('btnAlertCancel');

        // Reset Helper Classes
        btnConfirm.className = 'btn btn-primary'; // Reset base

        let iconHtml = '';
        let confirmText = 'Aceptar';

        // Determinar Estilo del Alerta
        if (type === 'danger' || type === 'delete') {
            iconHtml = '<div class="icon-shake"><i class="fa-solid fa-trash-can" style="color: #ef4444;"></i></div>';
            confirmText = 'Eliminar';
            btnConfirm.classList.add('btn-danger-action');
        } else if (type === 'edit') {
            iconHtml = '<div class="icon-pulse"><i class="fa-solid fa-pen-to-square" style="color: #8b5cf6;"></i></div>';
            confirmText = 'Editar';
            btnConfirm.classList.add('btn-primary-action');
        } else {
            iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
            confirmText = 'Aceptar';
            btnConfirm.classList.add('btn-success-action');
        }

        iconEl.innerHTML = iconHtml;
        titleEl.textContent = title;
        msgEl.textContent = message;

        // Estilar Botón Confirmar
        btnConfirm.textContent = confirmText;
        btnConfirm.style.background = ''; // Clear inline
        btnConfirm.style.borderColor = ''; // Clear inline

        btnCancel.style.display = showCancel ? 'inline-flex' : 'none';

        modal.classList.add('active');

        // Handlers de una sola vez
        const handleConfirm = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };

        const cleanup = () => {
            modal.classList.remove('active');
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
        };

        btnConfirm.onclick = handleConfirm;
        btnCancel.onclick = handleCancel;
    });
};

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        const item = currentInventory.find(i => i.id === editId);
        if (item) {
            openModal(item);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Dashboard-specific event listeners
    const dashCat = document.getElementById('dashFilterCategory');
    const dashBrand = document.getElementById('dashFilterBrand');

    if (dashCat && dashBrand) {
        const updateTopStock = () => UI.updateTopStockTable(currentInventory);
        dashCat.addEventListener('change', updateTopStock);
        dashBrand.addEventListener('change', updateTopStock);
    }

    const dashLow = document.getElementById('dashFilterLowStockCat');
    if (dashLow) {
        dashLow.addEventListener('change', () => UI.updateLowStockList(currentInventory));
    }

    const dashBest = document.getElementById('dashFilterBestCat');
    if (dashBest) {
        dashBest.addEventListener('change', () => UI.updateBestSellers(currentInventory));
    }
}


async function loadData() {
    try {
        console.log('Fetching data from Supabase...');
        const [inventory, categories] = await Promise.all([
            Storage.getInventory(),
            Storage.getCategories()
        ]);

        console.log('Inventory fetched:', inventory);
        currentInventory = inventory;
        UI.populateCategoryFilter(categories);
        refreshUI(currentInventory);
        return currentInventory;
    } catch (error) {
        console.error('CRITICAL ERROR LOADING DATA:', error);
        alert('Error Crítico: No se puieron cargar los datos. Revisa la consola (F12). ' + error.message);
        throw error;
    }
}

function refreshUI(inventory) {
    // Only update inventory view if elements exist
    if (document.getElementById('inventoryGrid')) {
        if (currentViewMode === 'grid') {
            document.getElementById('inventoryGrid').classList.remove('hidden');
            const tableContainer = document.getElementById('inventoryTableContainer');
            if (tableContainer) tableContainer.classList.add('hidden');

            const filtered = applyFilters(inventory);
            UI.renderInventory(filtered);
        } else {
            document.getElementById('inventoryGrid').classList.add('hidden');
            const tableContainer = document.getElementById('inventoryTableContainer');
            if (tableContainer) tableContainer.classList.remove('hidden');

            const filtered = applyFilters(inventory);
            UI.renderInventoryTable(filtered);
        }
    }

    // Always update these if present (Dashboard elements)
    if (document.getElementById('totalBooks')) UI.updateStats(inventory);
    if (document.getElementById('topStockTable')) UI.renderDashboardAnalytics(inventory);
}

function setupEventListeners() {
    // --- MOBILE MENU LOGIC ---
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');

    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Close when clicking a link (UX Improvement)
    const navLinks = document.querySelectorAll('.nav-btn');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
            }
        });
    });

    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            Storage.exportToExcel(currentInventory);
            UI.showToast('Reporte descargado', 'success');
        });
    }

    const viewGridBtn = document.getElementById('viewGrid');
    if (viewGridBtn) {
        viewGridBtn.addEventListener('click', () => {
            currentViewMode = 'grid';
            viewGridBtn.classList.add('active');
            document.getElementById('viewTable').classList.remove('active');
            refreshUI(currentInventory);
        });
    }

    const viewTableBtn = document.getElementById('viewTable');
    if (viewTableBtn) {
        viewTableBtn.addEventListener('click', () => {
            currentViewMode = 'table';
            viewTableBtn.classList.add('active');
            document.getElementById('viewGrid').classList.remove('active');
            refreshUI(currentInventory);
        });
    }

    // Modal Events
    const btnOpenModal = document.getElementById('btnOpenModal');
    if (btnOpenModal) {
        btnOpenModal.addEventListener('click', () => {
            openModal();
        });
    }

    const btnCancelModal = document.getElementById('btnCancelModal');
    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', closeModal);
    }

    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleFormSubmit(e);
            closeModal();
        });
    }

    // Filter Events (only if on inventory page)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', handleFilter);

    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) filterCategory.addEventListener('change', handleFilter);

    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.addEventListener('change', handleFilter);

    // --- Logic for "Active" category select/input ---
    const catSelect = document.getElementById('itemCategorySelect');
    const catInput = document.getElementById('itemCategoryInput');
    const btnCancelCat = document.getElementById('btnCancelNewCat');

    if (catSelect && catInput && btnCancelCat) {
        catSelect.addEventListener('change', (e) => {
            if (e.target.value === '__NEW__') {
                catSelect.classList.add('hidden');
                catInput.classList.remove('hidden');
                catInput.required = true;
                catInput.focus();
                btnCancelCat.classList.remove('hidden');
            }
        });

        btnCancelCat.addEventListener('click', () => {
            catInput.classList.add('hidden');
            catInput.required = false;
            catInput.value = '';
            catSelect.classList.remove('hidden');
            catSelect.value = catSelect.options[0].value; // Reset to first option
            btnCancelCat.classList.add('hidden');
        });
    }


    // --- ACCIONES ACTUALIZADAS (ASYNC) ---
    const handleAction = async (e) => {
        const btn = e.target.closest('.action-btn');
        if (btn) {
            e.stopPropagation();
            const id = btn.dataset.id;
            const item = currentInventory.find(i => i.id === id);

            if (btn.classList.contains('delete-btn')) {
                const confirmDelete = await showCustomAlert('¡Atención!', '¿Estás seguro de eliminar este producto?', 'danger', true);
                if (confirmDelete) {
                    Storage.deleteItem(id);
                    loadData();
                    UI.showToast('Producto eliminado', 'success');
                }
            } else if (btn.classList.contains('edit-btn')) {
                if (item) {
                    const confirmEdit = await showCustomAlert('¿Editar Producto?', `¿Modificar "${item.name}"?`, 'edit', true);
                    if (confirmEdit) openModal(item);
                }
            } else if (btn.classList.contains('sell-btn')) {
                if (item && item.stock > 0) {
                    item.stock--;
                    Storage.updateItem(item);
                    loadData();
                } else {
                    UI.showToast('¡No hay stock!', 'error');
                }
            }
            return;
        }

        const card = e.target.closest('.item-card');
        if (card && currentViewMode === 'grid') {
            const id = card.dataset.id;
            if (id) window.location.href = `./details.html?id=${id}`;
        }
    };

    // Card Click for Details (Grid View)
    const handleCardClick = (e) => {
        // Ignore if clicked on a button
        if (e.target.closest('.action-btn')) return;

        const card = e.target.closest('.item-card');
        if (card) {
            const id = card.dataset.id;
            if (id) {
                window.location.href = `details.html?id=${id}`;
            }
        }
    };

    const grid = document.getElementById('inventoryGrid');
    if (grid) {
        grid.addEventListener('click', handleAction);
        grid.addEventListener('click', handleCardClick);
    }

    const tableBody = document.getElementById('inventoryTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', handleAction);
    }
}


async function openModal(item = null) {
    const modal = document.getElementById('editModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('itemForm');

    // Populate Categories
    const categories = await Storage.getCategories();
    const catSelect = document.getElementById('itemCategorySelect');
    const catInput = document.getElementById('itemCategoryInput');

    catSelect.innerHTML = '';
    catSelect.innerHTML = '';
    categories.forEach(cat => {
        const val = typeof cat === 'object' ? cat.name : cat;
        if (val === '__NEW__') return; // Skip artifact

        const option = document.createElement('option');
        option.value = val;
        option.textContent = option.value.charAt(0).toUpperCase() + option.value.slice(1);
        catSelect.appendChild(option);
    });

    // Add New Option
    const newOption = document.createElement('option');
    newOption.value = '__NEW__';
    newOption.textContent = '+ Nueva Categoría...';
    newOption.style.fontWeight = 'bold';
    newOption.style.color = 'var(--primary-color)';
    catSelect.appendChild(newOption);

    // Toggle logic
    catSelect.onchange = () => {
        if (catSelect.value === '__NEW__') {
            catInput.style.display = 'block';
            catInput.disabled = false;
            catInput.focus();
        } else {
            catInput.style.display = 'none';
            catInput.disabled = true;
        }
    };

    if (item) {
        window.isEditing = true;
        window.editingId = item.id;
        title.textContent = 'Editar Producto';

        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemBrand').value = item.brand;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemCost').value = item.cost;
        document.getElementById('itemStock').value = item.stock;
        document.getElementById('itemDescription').value = item.description || ''; // Fix undefined description

        // Select Category or Custom
        const exists = categories.some(c => (typeof c === 'object' ? c.name : c) === item.category);
        if (exists) {
            catSelect.value = item.category;
            catInput.style.display = 'none';
        } else {
            // If weird category, default to first or handle as custom? 
            // For now, let's treat unknown as custom to preserve data
            catSelect.value = '__NEW__';
            catInput.style.display = 'block';
            catInput.disabled = false;
            catInput.value = item.category;
        }
    } else {
        window.isEditing = false;
        window.editingId = null;
        title.textContent = 'Nuevo Item';
        form.reset();
        document.getElementById('itemId').value = '';

        // Reset Category
        catSelect.value = catSelect.options.length > 1 ? catSelect.options[0].value : '__NEW__';
        catInput.style.display = 'none';
        catInput.value = '';
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
    window.isEditing = false;
    window.editingId = null;
    document.getElementById('itemForm').reset();
    document.getElementById('itemCategoryInput').style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const catSelect = document.getElementById('itemCategorySelect');
    let category = catSelect.value;

    if (category === '__NEW__') {
        const catInput = document.getElementById('itemCategoryInput');
        category = catInput.value.trim();
        if (!category) {
            alert('Por favor escribe el nombre de la nueva categoría');
            return;
        }
        category = category.toLowerCase();
    }

    const newItem = {
        id: window.isEditing ? window.editingId : undefined, // Let storage handle ID if new
        name: document.getElementById('itemName').value,
        brand: document.getElementById('itemBrand').value,
        category: category,
        price: parseFloat(document.getElementById('itemPrice').value),
        cost: parseFloat(document.getElementById('itemCost').value) || 0,
        stock: parseInt(document.getElementById('itemStock').value),
        sales: 0, // Preserve logic if needed
        description: document.getElementById('itemDescription').value, // Fix ID typo if any
        dateAdded: new Date().toISOString()
    };

    // Build object carefully to preserve props not in form if editing, 
    // but here we are replacing/updating. Storage handles merging usually?
    // Storage.updateItem takes a full object. 
    // Let's get original if editing to preserve image/dateAdded/sales
    if (window.isEditing) {
        const original = currentInventory.find(i => i.id === window.editingId);
        if (original) {
            newItem.id = original.id;
            newItem.image = original.image;
            newItem.dateAdded = original.dateAdded;
            newItem.sales = original.sales;
        }
        await Storage.updateItem(newItem);
        UI.showToast('Producto actualizado exitosamente');
    } else {
        await Storage.addItem(newItem);
        UI.showToast('Producto agregado exitosamente');
    }
    closeModal();
    loadData();
}

function applyFilters(inventory) {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('filterCategory').value;
    const sortBy = document.getElementById('sortBy').value;

    let filtered = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
            item.brand.toLowerCase().includes(searchTerm);
        const matchesCategory = category === 'all' || item.category === category;
        return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
        if (sortBy === 'priceHigh') return b.price - a.price;
        if (sortBy === 'priceLow') return a.price - b.price;
        if (sortBy === 'newest') return new Date(b.dateAdded) - new Date(a.dateAdded);
        if (sortBy === 'alpha') return a.name.localeCompare(b.name);
        return 0;
    });

    return filtered;
}

function handleFilter() {
    const searchTerm = document.getElementById('searchInput').value;
    if (searchTerm.length > 0) {
        const inventoryView = document.getElementById('inventoryView');
        if (inventoryView.style.display === 'none' || !inventoryView.classList.contains('active-view')) {
            switchView('inventory');
        }
    }
    refreshUI(currentInventory);
}