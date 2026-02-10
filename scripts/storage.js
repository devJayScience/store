
import { supabase } from './supabase-client.js';

const STORAGE_KEY = 'bookstore_inventory_v1';

export const Storage = {
    // Helper to get local fallback if needed
    getLocalInventory() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async getInventory() {
        try {
            // Query with Joins to get Category and Brand names
            const { data, error } = await supabase
                .from('productos')
                .select(`
                    id,
                    nombre,
                    descripcion,
                    precio_venta,
                    costo,
                    stock,
                    fecha_adicion,
                    categorias ( nombre ),
                    marcas ( nombre )
                `)
                .order('fecha_adicion', { ascending: false });

            if (error) throw error;

            console.log('Raw data from Supabase:', data);

            // Map DB columns to App fields
            const mappedData = data.map(item => ({
                id: item.id,
                name: item.nombre,
                brand: item.marcas?.nombre || 'Unknown',
                category: item.categorias?.nombre || 'Unknown',
                price: parseFloat(item.precio_venta),
                cost: parseFloat(item.costo),
                stock: item.stock,
                sales: 0, // Not in DB schema provided
                description: item.descripcion || '',
                image: '', // Not in DB schema provided
                dateAdded: item.fecha_adicion
            }));

            // Sync with local storage for offline capabilities or speed
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedData));
            return mappedData;
        } catch (err) {
            console.error('Error fetching from Supabase:', err);
            // Fallback to local storage if Supabase fails (e.g. no internet/bad creds)
            return this.getLocalInventory();
        }
    },

    async saveInventory(inventory) {
        // Legacy method for local JSON, kept for optimistic updates fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    },

    async getCategoryId(name) {
        if (!name) return null;
        // Check if exists
        const { data, error } = await supabase
            .from('categorias')
            .select('id')
            .ilike('nombre', name) // Case insensitive check
            .maybeSingle();

        if (data) return data.id;

        // Create if not exists
        // Categorias uses SERIAL, so no ID needed
        const { data: newData, error: insertError } = await supabase
            .from('categorias')
            .insert([{ nombre: name }])
            .select('id')
            .single();

        if (insertError) {
            console.error('Error creating category:', insertError);
            throw insertError;
        }
        return newData.id;
    },

    async getBrandId(name) {
        if (!name) return null;
        const { data, error } = await supabase
            .from('marcas')
            .select('id')
            .ilike('nombre', name)
            .maybeSingle();

        if (data) return data.id;

        // Generate ID: First 2 chars + Random. e.g. "HP001" style-ish (simplified unique)
        const prefix = name.substring(0, 2).toUpperCase();
        const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
        const newId = `${prefix}${randomNum}`;

        const { data: newData, error: insertError } = await supabase
            .from('marcas')
            .insert([{ id: newId, nombre: name }])
            .select('id')
            .single();

        if (insertError) {
            // Handle collision or error
            console.error('Error creating brand:', insertError);
            throw insertError;
        }
        return newData.id;
    },

    async getCategories() {
        try {
            const { data, error } = await supabase
                .from('categorias')
                .select('nombre')
                .order('nombre');

            if (error) throw error;
            return data.map(c => c.nombre);
        } catch (err) {
            console.error('Error fetching categories:', err);
            return [];
        }
    },

    async addItem(item) {
        try {
            const catId = await this.getCategoryId(item.category);
            const brandId = await this.getBrandId(item.brand);

            // Generate Product ID: Cat prefix + Random
            const prefix = (item.category || 'GEN').substring(0, 3).toUpperCase();
            const randomNum = Math.floor(100 + Math.random() * 900);
            const newId = `${prefix}${randomNum}`;

            const dbItem = {
                id: newId,
                nombre: item.name,
                descripcion: item.description,
                precio_venta: item.price,
                costo: item.cost,
                stock: item.stock,
                categoria_id: catId,
                marca_id: brandId,
                fecha_adicion: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('productos')
                .insert([dbItem])
                .select();

            if (error) throw error;
            console.log('Item added to Supabase:', data);

            // Sync local for UI responsiveness
            await this.getInventory();

        } catch (err) {
            console.error('Error adding to Supabase:', err);
            alert('Error al guardar en base de datos: ' + err.message);
        }
    },

    async updateItem(updatedItem) {
        try {
            const catId = await this.getCategoryId(updatedItem.category);
            const brandId = await this.getBrandId(updatedItem.brand);

            const dbItem = {
                nombre: updatedItem.name,
                descripcion: updatedItem.description,
                precio_venta: updatedItem.price,
                costo: updatedItem.cost,
                stock: updatedItem.stock,
                categoria_id: catId,
                marca_id: brandId
            };

            const { data, error } = await supabase
                .from('productos')
                .update(dbItem)
                .eq('id', updatedItem.id);

            if (error) throw error;
            console.log('Item updated in Supabase:', data);

            // Sync local
            await this.getInventory();

        } catch (err) {
            console.error('Error updating Supabase:', err);
            alert('Error al actualizar: ' + err.message);
        }
    },

    async deleteItem(id) {
        try {
            const { error } = await supabase
                .from('productos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            console.log('Item deleted from Supabase');

            await this.getInventory();
        } catch (err) {
            console.error('Error deleting from Supabase:', err);
            alert('Error al eliminar: ' + err.message);

            // Optimistic update
            const inventory = this.getLocalInventory();
            const newInventory = inventory.filter(item => item.id !== id);
            this.saveInventory(newInventory);
        }
    },

    // Initialize from JSON file (Project Requirement: Always use inventory.json)
    // Refactored to prioritize Supabase but verify placeholders
    async initializeFromJSON() {
        // Just trigger a load. 
        // Real initialization happens when getInventory is called by the app.
        window.dispatchEvent(new Event('storage-loaded'));
    },

    async loadDefaultData() {
        console.log('Default data loading via JSON is deprecated in Supabase mode.');
    },

    exportToExcel(inventory) {
        if (!inventory || inventory.length === 0) return;

        // CSV Header
        const headers = ['ID', 'Nombre', 'Marca', 'Categoría', 'Precio Venta', 'Costo', 'Stock', 'Fecha'];

        // Map data to CSV rows
        const rows = inventory.map(item => [
            item.id,
            `"${item.name.replace(/"/g, '""')}"`, // Escape quotes
            `"${item.brand.replace(/"/g, '""')}"`,
            `"${item.category.replace(/"/g, '""')}"`,
            item.price.toFixed(2),
            item.cost.toFixed(2),
            item.stock,
            item.dateAdded
        ]);

        // Combine header and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        // Trigger Download
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inventario_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
