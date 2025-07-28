const db = require('../db');

// Get all items
const getAllItems = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM items ORDER BY item_name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
};

// Get item by ID
const getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM items WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
};

// Create new item
const createItem = async (req, res) => {
    try {
        const { item_name, nick_name, hsn_code } = req.body;
        
        if (!item_name) {
            return res.status(400).json({ error: 'Item name is required' });
        }
        
        if (!nick_name) {
            return res.status(400).json({ error: 'Nick name is required' });
        }
        
        const result = await db.query(
            'INSERT INTO items (item_name, nick_name, hsn_code) VALUES ($1, $2, $3) RETURNING *',
            [item_name, nick_name, hsn_code || null]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating item:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Item name already exists' });
        }
        res.status(500).json({ error: 'Failed to create item' });
    }
};

// Update item
const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, nick_name, hsn_code } = req.body;
        
        if (!item_name) {
            return res.status(400).json({ error: 'Item name is required' });
        }
        
        if (!nick_name) {
            return res.status(400).json({ error: 'Nick name is required' });
        }
        
        const result = await db.query(
            'UPDATE items SET item_name = $1, nick_name = $2, hsn_code = $3 WHERE id = $4 RETURNING *',
            [item_name, nick_name, hsn_code || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating item:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Item name already exists' });
        }
        res.status(500).json({ error: 'Failed to update item' });
    }
};

// Delete item
const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
};

module.exports = {
    getAllItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem
}; 