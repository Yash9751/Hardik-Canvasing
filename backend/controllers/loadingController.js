const db = require('../db');
const stockController = require('./stockController');

// Function to update pending quantity for a sauda
const updatePendingQuantity = async (saudaId) => {
  try {
    // Get total loaded quantity for this sauda (convert kg to packs: 1 pack = 1000 kg)
    const loadedResult = await db.query(
      'SELECT COALESCE(SUM(CAST(vajan_kg AS DECIMAL(10,2))), 0) as total_loaded_kg FROM loading WHERE sauda_id = $1',
      [saudaId]
    );
    
    const totalLoadedKg = parseFloat(loadedResult.rows[0].total_loaded_kg);
    const totalLoadedPacks = totalLoadedKg / 1000; // Convert kg to packs
    
    // Get original quantity from sauda
    const saudaResult = await db.query(
      'SELECT quantity_packs FROM sauda WHERE id = $1',
      [saudaId]
    );
    
    if (saudaResult.rows.length === 0) {
      console.error('Sauda not found for pending quantity update:', saudaId);
      return;
    }
    
    const originalQuantity = saudaResult.rows[0].quantity_packs;
    const pendingQuantity = Math.max(0, Math.round(originalQuantity - totalLoadedPacks));
    
    // Update pending quantity
    await db.query(
      'UPDATE sauda SET pending_quantity_packs = $1 WHERE id = $2',
      [pendingQuantity, saudaId]
    );
    
    console.log(`Updated pending quantity for sauda ${saudaId}: ${originalQuantity} - ${totalLoadedPacks} = ${pendingQuantity} (${totalLoadedKg} kg loaded)`);
  } catch (error) {
    console.error('Error updating pending quantity:', error);
  }
};

// Get all loading entries
const getAllLoading = async (req, res) => {
  try {
    const { sauda_id, date } = req.query;
    let query = `
      SELECT l.*, s.sauda_no, s.transaction_type, p.party_name, i.item_name, ep.plant_name, t.transport_name,
             COALESCE(l.remarks, l.note, '') as remarks
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      LEFT JOIN transports t ON l.transport_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (sauda_id) {
      query += ' AND l.sauda_id = $1';
      params.push(sauda_id);
    }

    if (date) {
      const paramIndex = params.length + 1;
      query += ` AND l.loading_date = $${paramIndex}`;
      params.push(date);
    }

    query += ' ORDER BY l.loading_date DESC, l.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get loading by ID
const getLoadingById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT l.*, s.sauda_no, s.transaction_type, p.party_name, i.item_name, ep.plant_name, t.transport_name,
             COALESCE(l.remarks, l.note, '') as remarks
      FROM loading l
      LEFT JOIN sauda s ON l.sauda_id = s.id
      LEFT JOIN parties p ON s.party_id = p.id
      LEFT JOIN items i ON s.item_id = i.id
      LEFT JOIN ex_plants ep ON s.ex_plant_id = ep.id
      LEFT JOIN transports t ON l.transport_id = t.id
      WHERE l.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new loading entry
const createLoading = async (req, res) => {
  try {
    const { sauda_id, loading_date, vajan_kg, note, remarks, transport_id, tanker_number } = req.body;
    // Use remarks if provided, otherwise use note
    const finalNote = remarks || note || '';

    if (!sauda_id || !loading_date || !vajan_kg) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const result = await db.query(
      'INSERT INTO loading (sauda_id, loading_date, vajan_kg, note, remarks, transport_id, tanker_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [sauda_id, loading_date, vajan_kg, finalNote, finalNote, transport_id, tanker_number]
    );

    // Get item_id and ex_plant_id from sauda
    const saudaRes = await db.query('SELECT item_id, ex_plant_id FROM sauda WHERE id = $1', [sauda_id]);
    if (saudaRes.rows.length > 0) {
      const { item_id, ex_plant_id } = saudaRes.rows[0];
      await stockController.recalculateStock(item_id, ex_plant_id);
    }

    // Update pending quantity for the sauda
    await updatePendingQuantity(sauda_id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update loading entry
const updateLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const { sauda_id, loading_date, vajan_kg, note, remarks, transport_id, tanker_number } = req.body;
    // Use remarks if provided, otherwise use note
    const finalNote = remarks || note || '';

    const result = await db.query(
      'UPDATE loading SET sauda_id = $1, loading_date = $2, vajan_kg = $3, note = $4, remarks = $5, transport_id = $6, tanker_number = $7 WHERE id = $8 RETURNING *',
      [sauda_id, loading_date, vajan_kg, finalNote, finalNote, transport_id, tanker_number, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }

    // Update pending quantity for the sauda
    await updatePendingQuantity(sauda_id);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete loading entry
const deleteLoading = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM loading WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loading entry not found' });
    }
    
    // Update pending quantity for the sauda
    const saudaId = result.rows[0].sauda_id;
    await updatePendingQuantity(saudaId);
    
    res.json({ message: 'Loading entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting loading:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Recalculate all pending quantities (for fixing existing data)
const recalculateAllPendingQuantities = async (req, res) => {
  try {
    // Get all sauda transactions
    const saudaResult = await db.query('SELECT id FROM sauda');
    
    let updatedCount = 0;
    for (const sauda of saudaResult.rows) {
      await updatePendingQuantity(sauda.id);
      updatedCount++;
    }
    
    res.json({ 
      message: `Recalculated pending quantities for ${updatedCount} sauda transactions`,
      updatedCount 
    });
  } catch (error) {
    console.error('Error recalculating pending quantities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllLoading,
  getLoadingById,
  createLoading,
  updateLoading,
  deleteLoading,
  updatePendingQuantity,
  recalculateAllPendingQuantities
}; 