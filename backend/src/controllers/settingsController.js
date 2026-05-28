import { getDB } from '../config/database.js';

/**
 * Get system settings
 */
export const getSettings = async (req, res) => {
  try {
    const db = getDB();
    const settingsCollection = db.collection('settings');
    
    let settings = await settingsCollection.findOne({ _id: 'system' });
    
    // Return default settings if none exist
    if (!settings) {
      settings = {
        _id: 'system',
        eval_enabled: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      await settingsCollection.insertOne(settings);
    }
    
    res.json({
      success: true,
      data: {
        eval_enabled: settings.eval_enabled || true
      }
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
};

/**
 * Update system settings
 */
export const updateSettings = async (req, res) => {
  try {
    const { eval_enabled } = req.body;
    
    console.log('⚙️ [SETTINGS] updateSettings called');
    console.log('⚙️ [SETTINGS] req.user:', { id: req.user?.id, username: req.user?.username, role: req.user?.role });
    console.log('⚙️ [SETTINGS] req.session:', { user_id: req.session?.user_id, username: req.session?.username, admin_role: req.session?.admin_role });
    console.log('⚙️ [SETTINGS] eval_enabled:', eval_enabled);
    
    // Validate input
    if (eval_enabled === undefined || eval_enabled === null) {
      return res.status(400).json({
        success: false,
        message: 'eval_enabled is required'
      });
    }
    
    const db = getDB();
    const settingsCollection = db.collection('settings');
    
    const result = await settingsCollection.updateOne(
      { _id: 'system' },
      {
        $set: {
          eval_enabled: Boolean(eval_enabled),
          updated_at: new Date(),
          updated_by: req.user?.username || req.session?.username || 'system'
        }
      },
      { upsert: true }
    );
    
    console.log('⚙️ [SETTINGS] Update result:', { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId });
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        eval_enabled: Boolean(eval_enabled)
      }
    });
    
    console.log('⚙️ [SETTINGS] Settings updated successfully:', { eval_enabled: Boolean(eval_enabled) });
  } catch (error) {
    console.error('❌ [SETTINGS] Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};
