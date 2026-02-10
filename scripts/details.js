import { Storage } from './storage.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Loaded in details.js');
    let item = null; // Declare outside try block for wider scope

    try {
        await Storage.initializeFromJSON();
        console.log('Storage initialized');

        let inventory = await Storage.getInventory();
        console.log('Inventory fetched:', inventory);

        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        console.log('Target ID:', id);

        if (!inventory) {
            console.error('Inventory is null/undefined');
            return mostrarError();
        }

        item = inventory.find(i => String(i.id) === String(id));
        console.log('Found item:', item);

        if (!item) {
            console.warn('Item not found');
            return mostrarError();
        }

        renderData(item);
    } catch (err) {
        console.error('Critical error in details.js:', err);
        mostrarError(); // Try to show error state if something crashes
    }

    // FUNCIÓN DE ALERTA
    const showCustomAlert = (title, message, type = 'success', showCancel = false) => {
        return new Promise((resolve) => {
            const modal = document.getElementById('customAlertModal');
            // Reset any inline styles that might have been added
            const modalContent = modal.querySelector('.modal');
            if (modalContent) modalContent.style.cssText = '';

            const btnConfirm = document.getElementById('btnAlertConfirm');
            const btnCancel = document.getElementById('btnAlertCancel');

            // Acepta clases base, limpia modificadores previos
            btnConfirm.className = 'btn btn-primary';

            let iconHtml = '';
            let confirmText = 'Aceptar';

            if (type === 'danger' || type === 'delete') {
                // Delete / Danger Mode
                iconHtml = '<div class="icon-shake"><i class="fa-solid fa-trash-can" style="color: #ef4444;"></i></div>';
                confirmText = 'Eliminar';
                btnConfirm.classList.add('btn-danger-action');
            } else if (type === 'edit') {
                // Edit Mode
                iconHtml = '<div class="icon-pulse"><i class="fa-solid fa-pen-to-square" style="color: #8b5cf6;"></i></div>';
                confirmText = 'Editar';
                btnConfirm.classList.add('btn-primary-action');
            } else {
                // Success / Info Mode
                iconHtml = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
                confirmText = 'Aceptar';
                btnConfirm.classList.add('btn-success-action');
            }

            document.getElementById('alertIcon').innerHTML = iconHtml;
            document.getElementById('alertTitle').textContent = title;
            document.getElementById('alertMessage').textContent = message;

            btnConfirm.textContent = confirmText;
            // Remove inline styles to allow classes to work
            btnConfirm.style.background = '';
            btnConfirm.style.borderColor = '';

            btnCancel.style.display = showCancel ? 'inline-flex' : 'none';

            modal.classList.add('active');

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modal.classList.remove('active');
                btnConfirm.onclick = null;
                btnCancel.onclick = null;
            };

            btnConfirm.onclick = handleConfirm;
            btnCancel.onclick = handleCancel;
        });
    };

    // POPULATE CATEGORIES & FORM
    async function poblarFormulario(p) {
        console.log('Populating form with:', p);
        if (!p) return console.error('No data to populate form');

        // 1. POPULATE BASIC FIELDS IMMEDIATELY (Prevent empty form)
        document.getElementById('editName').value = p.name || '';
        document.getElementById('editBrand').value = p.brand || '';
        document.getElementById('editCategory').value = p.category || ''; // Fallback
        document.getElementById('editPrice').value = p.price || 0;
        document.getElementById('editCost').value = p.cost || 0;
        document.getElementById('editStock').value = p.stock || 0;
        document.getElementById('editDescription').value = p.description || '';

        try {
            // 2. Load categories asynchronously to enrich the select
            const categories = await Storage.getCategories();
            console.log('Categories loaded:', categories);

            const select = document.getElementById('editCategory');
            if (!select) return;

            // Keep current value to restore it after clearing
            const currentValue = p.category;

            select.innerHTML = '';

            categories.forEach(cat => {
                // Handle object {id, name} or string "Name"
                const catName = (typeof cat === 'object' && cat !== null) ? cat.name : cat;

                if (catName && catName !== '__NEW__') {
                    const option = document.createElement('option');
                    option.value = catName;
                    option.textContent = catName.charAt(0).toUpperCase() + catName.slice(1);
                    select.appendChild(option);
                }
            });

            // If current category isn't in list (custom?), add it
            if (currentValue && !categories.some(c => {
                const cName = (typeof c === 'object' && c !== null) ? c.name : c;
                return cName && cName.toLowerCase() === currentValue.toLowerCase();
            })) {
                const option = document.createElement('option');
                option.value = currentValue;
                option.textContent = currentValue;
                select.appendChild(option);
            }

            // Add "Create New" option
            const newOption = document.createElement('option');
            newOption.value = '__NEW__';
            newOption.textContent = '+ Nueva Categoría...';
            newOption.style.fontWeight = 'bold';
            newOption.style.color = 'var(--primary-color)';
            select.appendChild(newOption);

            // Toggle input visibility
            const newCatInput = document.getElementById('newCategoryInput');
            select.onchange = () => {
                if (select.value === '__NEW__') {
                    newCatInput.style.display = 'block';
                    newCatInput.focus();
                } else {
                    newCatInput.style.display = 'none';
                }
            };

            // Restore selection
            select.value = currentValue;
            // Also hide input if not new
            if (newCatInput) newCatInput.style.display = 'none';

            console.log('Form categories enriched');
        } catch (err) {
            console.error('Error loading categories (basic data preserved):', err);
        }
    }

    // FORM SUBMISSION


    // FORM SUBMISSION
    const editForm = document.getElementById('editItemForm');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();

            let category = document.getElementById('editCategory').value;
            if (category === '__NEW__') {
                const newCatVal = document.getElementById('newCategoryInput').value.trim();
                // Ensure proper capitalization for consistent display (Optional but nice)
                // newCatVal = newCatVal.charAt(0).toUpperCase() + newCatVal.slice(1);

                if (!newCatVal) {
                    alert('Por favor ingrese el nombre de la nueva categoría');
                    return;
                }
                category = newCatVal; // Save as typed
            }

            const updatedItem = {
                ...item,
                name: document.getElementById('editName').value,
                brand: document.getElementById('editBrand').value,
                category: category,
                price: parseFloat(document.getElementById('editPrice').value),
                cost: parseFloat(document.getElementById('editCost').value),
                stock: parseInt(document.getElementById('editStock').value),
                description: document.getElementById('editDescription').value
            };

            try {
                await Storage.updateItem(updatedItem);

                // Close modal
                document.getElementById('editModal').classList.remove('active');

                // Show success
                if (window.UI && window.UI.showToast) {
                    window.UI.showToast('Producto actualizado correctamente');
                } else {
                    alert('Producto actualizado');
                }

                // Refresh Page to see new category in filters etc
                window.location.reload();

            } catch (err) {
                console.error('Error updating:', err);
                alert('Error al actualizar el producto');
            }
        };
    }

    // BOTÓN EDITAR
    const btnEdit = document.getElementById('btnEdit');
    if (btnEdit) {
        btnEdit.onclick = async () => {
            if (!item) return console.error('No item to edit');
            console.log('Edit button clicked');
            // Use 'edit' type
            const ok = await showCustomAlert('¿Editar Producto?', `Estás a punto de editar "${item.name}".`, 'edit', true);
            if (ok) {
                console.log('Edit confirmed, opening modal');
                document.getElementById('editModal').classList.add('active');
                await poblarFormulario(item);
            }
        };
    }

    // BOTÓN ELIMINAR
    const btnDelete = document.getElementById('btnDelete');
    if (btnDelete) {
        btnDelete.onclick = async () => {
            if (!item) return console.error('No item to delete');
            console.log('Delete button clicked');
            // Use 'delete' type
            const ok = await showCustomAlert('¿Eliminar Producto?', 'Esta acción no se puede deshacer.', 'delete', true);
            if (ok) {
                console.log('Delete confirmed, deleting item...');
                try {
                    await Storage.deleteItem(item.id);
                    console.log('Item deleted');
                    window.location.href = 'index.html';
                } catch (err) {
                    console.error('Error deleting:', err);
                    showCustomAlert('Error', 'No se pudo eliminar el producto.', 'danger');
                }
            }
        };
    }

    // CANCELAR EDICIÓN
    const btnCancel = document.getElementById('btnCancelEdit');
    if (btnCancel) {
        btnCancel.onclick = () => {
            document.getElementById('editModal').classList.remove('active');
        };
    }

    // GUARDAR CAMBIOS

    function renderData(item) {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('detailsContainer').style.display = 'grid';
        document.getElementById('detailImage').src = item.image || 'https://placehold.co/600x400/png?text=No+Image';
        document.getElementById('detailName').textContent = item.name;
        document.getElementById('detailBrand').textContent = item.brand;
        document.getElementById('detailPrice').textContent = `$${item.price.toFixed(2)}`;
        document.getElementById('detailCost').textContent = `Costo: $${(item.cost || 0).toFixed(2)}`;
        document.getElementById('detailStock').textContent = item.stock;
        document.getElementById('detailDescription').textContent = item.description || 'Sin descripción.';
    }

    function mostrarError() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('detailsContainer').style.display = 'none';
        document.getElementById('errorState').classList.remove('hidden');
    }
});