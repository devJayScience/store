import { Storage } from './storage.js';

// DOM Elements
const galleryView = document.getElementById('galleryView');
const createView = document.getElementById('createView');
const quotesGrid = document.getElementById('quotesGrid');
const quoteItemsBody = document.getElementById('quoteItemsBody');
const grandTotalEl = document.getElementById('grandTotal');
const emptyQuoteState = document.getElementById('emptyQuoteState');

// Search & Input Elements
const productSearch = document.getElementById('productSearch');
const paramAutocomplete = document.getElementById('paramAutocomplete');
const clientNameInput = document.getElementById('clientName');

// Success Modal Elements
const successModal = document.getElementById('successModal');
const successTitle = document.getElementById('successTitle');
const successMessage = document.getElementById('successMessage');
const btnCloseSuccess = document.getElementById('btnCloseSuccess');

// Confirm Modal Elements
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const btnAcceptConfirm = document.getElementById('btnAcceptConfirm');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');

let fullInventory = [];
let currentQuoteItems = [];

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Cargar inventario mapeado
        fullInventory = await Storage.getInventory();

        // 2. Cargar cotizaciones
        loadQuotes();

        // 3. Configurar eventos
        setupEventListeners();
        setupMobileMenu(); // New Mobile Menu Logic

        console.log("Sistema de cotizaciones iniciado correctamente.");
    } catch (error) {
        console.error("Error al iniciar:", error);
    }
});

// --- Lógica de Menú Móvil ---
function setupMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileMenuOverlay');
    const navLinks = document.querySelectorAll('.nav-btn');

    if (!btn || !sidebar) return;

    const toggleMenu = () => {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    };

    const closeMenu = () => {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    };

    btn.addEventListener('click', toggleMenu);

    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }

    // Close when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// --- Lógica de Modales ---

function showCustomModal(title, message, callback = null) {
    successTitle.textContent = title;
    successMessage.textContent = message;

    // Show with animation
    successModal.classList.remove('hidden');
    requestAnimationFrame(() => {
        successModal.classList.add('active');
    });

    btnCloseSuccess.onclick = () => {
        successModal.classList.remove('active');
        setTimeout(() => {
            successModal.classList.add('hidden');
            if (callback) callback();
        }, 300);
    };
}

// Variable de control para evitar guardados duplicados
let isSaving = false;
let editingQuoteId = null; // State for tracking edit mode

// --- Nueva Lógica de Confirmación con Promesa ---
function askConfirmation(title, message) {
    return new Promise((resolve) => {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;

        // Use 'active' class for transition as per main.css
        confirmModal.classList.remove('hidden'); // Ensure display is not none
        // Small delay to allow display to apply before opacity transition if needed, 
        // but main.css seems to handle it via overlay.active
        requestAnimationFrame(() => {
            confirmModal.classList.add('active');
        });

        const cleanup = () => {
            confirmModal.classList.remove('active');
            setTimeout(() => {
                confirmModal.classList.add('hidden');
            }, 300); // Wait for transition
        };

        btnAcceptConfirm.onclick = () => {
            cleanup();
            resolve(true);
        };

        btnCancelConfirm.onclick = () => {
            cleanup();
            resolve(false);
        };
    });
}
// --- Navegación Robusta ---
function showCreateView() {
    // Usamos clases exclusivamente para evitar conflictos con display: block/none manual
    galleryView.classList.add('hidden');
    galleryView.classList.remove('active-view');

    createView.classList.remove('hidden');
    createView.classList.add('active-view');

    // Only reset if NOT editing (allows keeping data when switching views if needed, though we force reset on New)
    if (!editingQuoteId) {
        document.querySelector('.quote-header h1').innerHTML = '<i class="fa-solid fa-file-signature"></i> Nueva Lista';
        clientNameInput.value = '';
        productSearch.value = '';
        currentQuoteItems = [];
        renderQuoteItems();
    }
}

function showGalleryView() {
    createView.classList.add('hidden');
    createView.classList.remove('active-view');

    galleryView.classList.remove('hidden');
    galleryView.classList.add('active-view');

    // Reset Edit State
    editingQuoteId = null;
    document.querySelector('.quote-header h1').innerHTML = '<i class="fa-solid fa-file-signature"></i> Nueva Lista'; // Reset Title
    clientNameInput.value = '';
    currentQuoteItems = [];

    loadQuotes();
}

async function loadQuoteForEditing(quote) {
    try {
        // 1. Fetch details
        const details = await Storage.getQuoteDetails(quote.id);

        if (!details || details.length === 0) {
            alert('Error: No se pudieron detalles de la cotización.');
            return;
        }

        // 2. Set State
        editingQuoteId = quote.id;
        clientNameInput.value = quote.nombre_cliente;

        // 3. Map items
        currentQuoteItems = details.map(d => ({
            id: d.producto_id,
            name: d.productos?.nombre || 'Producto Desconocido',
            brand: d.productos?.marcas?.nombre || 'Marca Desconocida',
            price: d.precio_unitario_momento,
            quantity: d.cantidad
        }));

        // 4. Update UI
        document.querySelector('.quote-header h1').innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Editar Lista`;
        renderQuoteItems();
        showCreateView(); // This will check editingQuoteId and NOT reset

    } catch (err) {
        console.error('Error loading quote for edit:', err);
        alert('Error al cargar la cotización para editar.');
    }
}

// --- Gestión de Datos ---
async function loadQuotes() {
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.classList.remove('hidden');

    try {
        const quotes = await Storage.getQuotes();
        renderQuotesGallery(quotes);
    } catch (err) {
        console.error("Error al cargar cotizaciones:", err);
    } finally {
        if (loadingState) loadingState.classList.add('hidden');
    }
}

function renderQuotesGallery(quotes) {
    quotesGrid.innerHTML = '';
    if (!quotes || quotes.length === 0) {
        quotesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">
                <i class="fa-solid fa-folder-open fa-3x" style="margin-bottom: 1rem;"></i>
                <p>No hay cotizaciones registradas.</p>
            </div>`;
        return;
    }

    quotes.forEach(quote => {
        const card = document.createElement('div');
        card.className = 'item-card glass-panel animate-in';
        card.style.cursor = 'pointer'; // Indicate clickability
        card.innerHTML = `
            <div class="card-content" style="padding: 1.5rem;">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color: #1e293b; font-weight:700; margin:0;">${quote.nombre_cliente}</h3>
                    <span class="badge ${quote.estado === 'pendiente' ? 'office' : 'success'}">${quote.estado}</span>
                </div>
                <p style="color: var(--text-muted); margin: 0.8rem 0; font-size: 0.85rem;">
                    Fecha: ${new Date(quote.fecha_creacion).toLocaleDateString()}
                </p>
                <div class="card-footer" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.4rem; font-weight: 800; color: #1e293b;">$${parseFloat(quote.total_estimado).toFixed(2)}</span>
                    <button class="action-btn delete-quote-btn" style="color: var(--danger); border:none; background:none; cursor:pointer; font-size:1.1rem; z-index: 10;">
                       <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;

        // Click on Card to Edit
        card.onclick = (e) => {
            // Prevent if clicking on delete button
            if (e.target.closest('.delete-quote-btn')) return;
            loadQuoteForEditing(quote);
        };

        // Click on Delete Button
        card.querySelector('.delete-quote-btn').onclick = async (e) => {
            e.stopPropagation();
            const confirmed = await askConfirmation('Eliminar Cotización', '¿Estás seguro de que deseas eliminar esta lista permanentemente?');
            if (confirmed) {
                await Storage.deleteQuote(quote.id);
                loadQuotes();
            }
        };
        quotesGrid.appendChild(card);
    });
}

// --- Lógica de Tabla ---
function addItemToQuote(product) {
    const existing = currentQuoteItems.find(i => i.id === product.id);
    if (existing) {
        existing.quantity++;
    } else {
        currentQuoteItems.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            quantity: 1
        });
    }
    renderQuoteItems();
}

function renderQuoteItems() {
    quoteItemsBody.innerHTML = '';
    let totalGeneral = 0;

    if (currentQuoteItems.length === 0) {
        emptyQuoteState.classList.remove('hidden');
        grandTotalEl.textContent = '$0.00';
        return;
    }

    emptyQuoteState.classList.add('hidden');

    currentQuoteItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        totalGeneral += subtotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column;">
                    <b style="color: #1e293b; font-size:1rem;">${item.name}</b>
                    <small style="color: #64748b;">ID: ${item.id.toString().substring(0, 8)}</small>
                </div>
            </td>
            <td><span class="badge" style="background: rgba(139, 92, 246, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 8px;">${item.brand}</span></td>
            <td style="color: #475569; font-weight:500;">$${item.price.toFixed(2)}</td>
            <td style="text-align: center;">
                <input type="number" class="qty-control" value="${item.quantity}" min="1" 
                       oninput="window.updateQuantity(${index}, this.value)"
                       style="width: 70px; padding: 5px; border-radius: 8px; border: 1px solid #ddd; text-align: center;">
            </td>
            <td style="color: var(--success); font-weight: 700;">$${subtotal.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="delete-row-btn" onclick="window.removeItem(${index})" 
                        style="color: var(--danger); background: rgba(239, 64, 64, 0.1); border:none; width:35px; height:35px; border-radius:50%; cursor:pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </td>`;
        quoteItemsBody.appendChild(tr);
    });

    grandTotalEl.textContent = `$${totalGeneral.toFixed(2)}`;
}

// Global scope para eventos en HTML
window.updateQuantity = (index, value) => {
    const qty = parseInt(value);
    if (!isNaN(qty) && qty > 0) {
        currentQuoteItems[index].quantity = qty;
        renderQuoteItems();
    }
};

window.removeItem = (index) => {
    currentQuoteItems.splice(index, 1);
    renderQuoteItems();
};

// --- Autocomplete ---
function setupAutocomplete() {
    productSearch.oninput = (e) => {
        const query = e.target.value.trim().toLowerCase();
        paramAutocomplete.innerHTML = '';

        if (query.length < 1) {
            paramAutocomplete.classList.add('hidden');
            return;
        }

        const matches = fullInventory.filter(item =>
            item.name.toLowerCase().includes(query) ||
            item.brand.toLowerCase().includes(query)
        ).slice(0, 6);

        if (matches.length > 0) {
            paramAutocomplete.classList.remove('hidden');
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'autocomplete-suggestion';
                div.style.padding = '12px 15px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';

                div.innerHTML = `
                    <div>
                        <span style="color: white; font-weight: 600; display: block;">${match.name}</span>
                        <small style="color: #94a3b8;">${match.brand}</small>
                    </div>
                    <div style="color: #34d399; font-weight: 700;">$${match.price.toFixed(2)}</div>`;

                div.onclick = () => {
                    addItemToQuote(match);
                    productSearch.value = '';
                    paramAutocomplete.classList.add('hidden');
                    productSearch.focus();
                };
                paramAutocomplete.appendChild(div);
            });
        } else {
            paramAutocomplete.classList.add('hidden');
        }
    };

    document.addEventListener('click', (e) => {
        if (!productSearch.contains(e.target) && !paramAutocomplete.contains(e.target)) {
            paramAutocomplete.classList.add('hidden');
        }
    });
}

// --- Setup Event Listeners ---
function setupEventListeners() {
    console.log('DEBUG: setupEventListeners START');

    // 1. Navigation
    const btnNew = document.getElementById('btnNewQuote');
    if (btnNew) {
        console.log('DEBUG: btnNewQuote found');
        btnNew.onclick = () => {
            editingQuoteId = null; // Ensure new mode
            showCreateView();
        };
    } else {
        console.error('DEBUG: btnNewQuote NOT FOUND');
    }

    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
        btnBack.onclick = showGalleryView;
    }

    // 2. Search Autocomplete
    setupAutocomplete();

    // 3. Save Quote Button
    const btnSave = document.getElementById('btnSaveQuote');
    if (btnSave) {
        console.log('DEBUG: btnSaveQuote found');
        btnSave.onclick = async () => {
            console.log('DEBUG: btnSaveQuote CLICKED');

            // Prevent double submission
            if (isSaving) {
                console.warn('DEBUG: isSaving is true, ignoring click');
                return;
            }

            const client = clientNameInput.value.trim();
            console.log('DEBUG: Client Name =', client);

            if (!client) {
                alert('Por favor, ingresa el nombre del cliente.');
                clientNameInput.focus();
                return;
            }
            if (currentQuoteItems.length === 0) {
                alert('La lista está vacía. Agrega productos antes de guardar.');
                productSearch.focus();
                return;
            }

            const actionVerb = editingQuoteId ? 'Actualizar' : 'Guardar';
            const actionMsg = editingQuoteId ? `¿Deseas actualizar la cotización de ${client}?` : `¿Deseas registrar la lista para ${client}?`;

            // Confirm Action
            console.log('DEBUG: Calling askConfirmation...');
            const confirmed = await askConfirmation(`${actionVerb} Lista`, actionMsg);
            console.log('DEBUG: Confirmation result =', confirmed);

            if (confirmed) {
                isSaving = true; // Lock UI
                const total = currentQuoteItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);

                try {
                    if (editingQuoteId) {
                        console.log('DEBUG: Calling Storage.updateQuote...');
                        await Storage.updateQuote(editingQuoteId, client, total, currentQuoteItems);
                        console.log('DEBUG: Storage.updateQuote SUCCESS');
                    } else {
                        console.log('DEBUG: Calling Storage.createQuote...');
                        await Storage.createQuote(client, total, currentQuoteItems);
                        console.log('DEBUG: Storage.createQuote SUCCESS');
                    }

                    showCustomModal('¡Éxito!', `La lista se ${editingQuoteId ? 'actualizó' : 'guardó'} correctamente.`, () => {
                        isSaving = false;
                        showGalleryView();
                    });
                } catch (err) {
                    console.error('DEBUG: Error saving quote:', err);
                    isSaving = false;
                    showCustomModal('Error', `No se pudo ${actionVerb.toLowerCase()} la lista. ` + err.message);
                }
            }
        };
    } else {
        console.error('DEBUG: btnSaveQuote NOT FOUND');
    }

    // 4. PDF Download Button
    const btnPdf = document.getElementById('btnWebPdf');
    if (btnPdf) {
        // console.log('DEBUG: btnWebPdf found');
        btnPdf.onclick = async () => {
            // console.log('DEBUG: btnWebPdf CLICKED');

            if (currentQuoteItems.length === 0) {
                alert('No hay items para generar PDF.');
                return;
            }

            // Check if library exists
            if (typeof html2pdf === 'undefined') {
                console.error('Error: html2pdf is UNDEFINED');
                alert('Error: La librería PDF no está cargada correctamente.');
                return;
            }

            // Confirm Action
            const confirmed = await askConfirmation('Descargar PDF', '¿Deseas generar el archivo PDF de esta cotización?');

            if (confirmed) {
                const client = clientNameInput.value.trim() || 'Desconocido';
                const element = document.getElementById('printableArea');

                // --- Elements to Hide/Modify ---
                const header = element.querySelector('.quote-header');
                const form = element.querySelector('.creation-form');
                const actionBtns = element.querySelector('.action-buttons'); // Bottom buttons
                const deleteBtns = element.querySelectorAll('.delete-row-btn'); // Row delete buttons
                const qtyInputs = element.querySelectorAll('.qty-control'); // Quantity inputs
                const tableActions = element.querySelectorAll('th:last-child, td:last-child'); // Last column (Actions)

                // --- Temp Title Element ---
                let tempTitle = document.createElement('div');
                tempTitle.innerHTML = `
                    <h1 style="font-size: 2rem; color: #1e293b; margin-bottom: 0.5rem; text-align: center;">Cotización</h1>
                    <h2 style="font-size: 1.5rem; color: #64748b; margin-bottom: 2rem; text-align: center;">Cliente: ${client}</h2>
                `;

                try {
                    // 1. Prepare UI for PDF
                    if (header) header.style.display = 'none';
                    if (form) form.style.display = 'none';
                    if (actionBtns) actionBtns.style.display = 'none';

                    tableActions.forEach(el => el.style.display = 'none');
                    deleteBtns.forEach(btn => btn.style.display = 'none');

                    // Make inputs look like text
                    qtyInputs.forEach(input => {
                        input.style.border = 'none';
                        input.style.textAlign = 'center';
                        input.style.background = 'transparent';
                    });

                    // Insert Title
                    element.prepend(tempTitle);

                    const opt = {
                        margin: 0.5,
                        filename: `Cotizacion_${client.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
                    };

                    // console.log('DEBUG: Starting html2pdf generation...');
                    await html2pdf().set(opt).from(element).save();
                    // console.log('DEBUG: PDF generation SUCCESS');

                    showCustomModal('PDF Descargado', `El archivo de ${client} se ha generado correctamente.`);

                } catch (err) {
                    console.error('Error generating PDF:', err);
                    showCustomModal('Error PDF', 'Hubo un problema al generar el PDF.');
                } finally {
                    // 2. Restore UI
                    if (header) header.style.display = '';
                    if (form) form.style.display = '';
                    if (actionBtns) actionBtns.style.display = '';

                    tableActions.forEach(el => el.style.display = '');
                    deleteBtns.forEach(btn => btn.style.display = '');

                    qtyInputs.forEach(input => {
                        input.style.border = '';
                        input.style.textAlign = '';
                        input.style.background = '';
                    });

                    // Remove Temp Title
                    if (tempTitle && tempTitle.parentNode) {
                        tempTitle.parentNode.removeChild(tempTitle);
                    }
                }
            }
        };
    } else {
        console.error('btnWebPdf NOT FOUND');
    }

    console.log('DEBUG: setupEventListeners END');
}