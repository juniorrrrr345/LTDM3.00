const { MongoClient } = require('mongodb');

// DONNÉES LTDM.3.0
const MONGODB_URI = 'mongodb+srv://genesistvl777:BtHiS2lycR1iNTKN@genesistvl77.62ytsmy.mongodb.net/?retryWrites=true&w=majority&appName=genesistvl77';
const MONGODB_DB_NAME = 'test'; // Base confirmée avec données

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: 'f65b4d99-d786-49a6-ac1a-8f58da52624c',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

async function executeSqlOnD1(sql, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  const curlCmd = `curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/d1/database/${CLOUDFLARE_CONFIG.databaseId}/query" \\
    -H "Authorization: Bearer ${CLOUDFLARE_CONFIG.apiToken}" \\
    -H "Content-Type: application/json" \\
    --data '{"sql": "${sql}", "params": ${JSON.stringify(params)}}'`;
  
  try {
    const { stdout } = await execAsync(curlCmd);
    const data = JSON.parse(stdout);
    if (!data.success) {
      throw new Error(`D1 Error: ${JSON.stringify(data.errors)}`);
    }
    return data;
  } catch (error) {
    throw error;
  }
}

async function migrateCleanData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    
    console.log('🔄 Migration PROPRE depuis MongoDB...');
    
    // Migration categories UNIQUES
    console.log('📁 Migration catégories uniques...');
    const mongoCategories = await db.collection('categories').find({}).toArray();
    const uniqueCategories = [...new Map(mongoCategories.map(cat => [cat.name, cat])).values()];
    
    for (const cat of uniqueCategories) {
      await executeSqlOnD1(
        'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
        [String(cat.name || ''), String(cat.emoji || cat.icon || '📦'), String(cat.color || '#22C55E')]
      );
    }
    console.log(`✅ ${uniqueCategories.length} catégories uniques migrées`);
    
    // Migration farms UNIQUES
    console.log('🏪 Migration farms uniques...');
    const mongoFarms = await db.collection('farms').find({}).toArray();
    const uniqueFarms = [...new Map(mongoFarms.map(farm => [farm.name, farm])).values()];
    
    for (const farm of uniqueFarms) {
      await executeSqlOnD1(
        'INSERT INTO farms (name, description, location, contact) VALUES (?, ?, ?, ?)',
        [farm.name || 'Farm', 'Production LTDM.3.0', farm.location || farm.country || 'Local', 'contact@ltdm.com']
      );
    }
    console.log(`✅ ${uniqueFarms.length} farms uniques migrées`);
    
    // Migration social_links UNIQUES
    console.log('📱 Migration liens sociaux uniques...');
    const mongoSocial = await db.collection('socialLinks').find({}).toArray();
    const uniqueSocial = [...new Map(mongoSocial.map(link => [link.name || link.platform, link])).values()];
    
    for (const link of uniqueSocial) {
      await executeSqlOnD1(
        'INSERT INTO social_links (platform, url, icon, is_available) VALUES (?, ?, ?, ?)',
        [link.name || link.platform || 'Platform', link.url || '#', link.icon || '📱', 1]
      );
    }
    console.log(`✅ ${uniqueSocial.length} liens sociaux uniques migrés`);
    
    // Migration products UNIQUES avec conversion noms → IDs
    console.log('🛍️ Migration produits uniques...');
    const mongoProducts = await db.collection('products').find({}).toArray();
    const uniqueProducts = [...new Map(mongoProducts.map(prod => [prod.name, prod])).values()];
    
    for (const product of uniqueProducts) {
      // Trouver les IDs des catégories et farms
      const catResult = await executeSqlOnD1('SELECT id FROM categories WHERE name = ?', [product.category || '']);
      const farmResult = await executeSqlOnD1('SELECT id FROM farms WHERE name = ?', [product.farm || '']);
      
      const category_id = catResult.result?.[0]?.results?.[0]?.id || 1;
      const farm_id = farmResult.result?.[0]?.results?.[0]?.id || 1;
      
      await executeSqlOnD1(
        'INSERT INTO products (name, description, category_id, farm_id, image_url, video_url, price, stock, prices, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          product.name || 'Produit',
          product.description || 'Produit LTDM.3.0 de qualité',
          category_id,
          farm_id,
          product.image || '',
          product.video || '',
          Number(product.price || 0),
          Number(product.stock || 10),
          JSON.stringify(product.prices || {}),
          1
        ]
      );
    }
    console.log(`✅ ${uniqueProducts.length} produits uniques migrés`);
    
    // Migration settings
    await executeSqlOnD1(
      'INSERT INTO settings (id, shop_title, theme_color, background_opacity, background_blur) VALUES (?, ?, ?, ?, ?)',
      [1, 'LTDM.3.0', 'glow', 20, 5]
    );
    console.log('✅ Settings LTDM.3.0 configurés');
    
    console.log('✅ Migration MongoDB → D1 PROPRE terminée');
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
  } finally {
    await client.close();
  }
}

migrateCleanData();