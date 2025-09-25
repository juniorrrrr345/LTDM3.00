const { MongoClient } = require('mongodb');

// CONNEXION MONGODB LTDM
const MONGODB_URI = 'mongodb+srv://LTDM:lX94uMAUu5KdIZpF@cluster0.giuejd7.mongodb.net/ltdm30_shop?retryWrites=true&w=majority';
const MONGODB_DB_NAME = 'ltdm30_shop';

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

async function migrateLTDMData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(MONGODB_DB_NAME);
    
    console.log('🔄 Migration LTDM depuis MongoDB...');
    
    // 1. MIGRATION CATÉGORIES LTDM
    console.log('📁 Migration catégories LTDM...');
    const mongoCategories = await db.collection('categories').find({}).toArray();
    console.log(`📊 ${mongoCategories.length} catégories trouvées dans MongoDB`);
    
    for (const cat of mongoCategories) {
      console.log(`📁 Migration catégorie: ${cat.name}`);
      await executeSqlOnD1(
        'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
        [
          String(cat.name || 'Catégorie LTDM'), 
          String(cat.icon || cat.emoji || '📦'), 
          String(cat.color || '#22C55E')
        ]
      );
    }
    console.log(`✅ ${mongoCategories.length} catégories LTDM migrées`);
    
    // 2. MIGRATION FARMS LTDM
    console.log('🏪 Migration farms LTDM...');
    const mongoFarms = await db.collection('farms').find({}).toArray();
    console.log(`📊 ${mongoFarms.length} farms trouvées dans MongoDB`);
    
    for (const farm of mongoFarms) {
      console.log(`🏪 Migration farm: ${farm.name}`);
      await executeSqlOnD1(
        'INSERT INTO farms (name, description, location, contact) VALUES (?, ?, ?, ?)',
        [
          farm.name || 'Farm LTDM',
          farm.description || 'Production LTDM.3.0',
          farm.location || farm.country || 'Local',
          farm.contact || 'contact@ltdm.com'
        ]
      );
    }
    console.log(`✅ ${mongoFarms.length} farms LTDM migrées`);
    
    // 3. MIGRATION LIENS SOCIAUX LTDM
    console.log('📱 Migration liens sociaux LTDM...');
    const mongoSocial = await db.collection('socialLinks').find({}).toArray();
    console.log(`📊 ${mongoSocial.length} liens sociaux trouvés dans MongoDB`);
    
    for (const link of mongoSocial) {
      console.log(`📱 Migration lien: ${link.name || link.platform}`);
      await executeSqlOnD1(
        'INSERT INTO social_links (platform, url, icon, is_available) VALUES (?, ?, ?, ?)',
        [
          link.name || link.platform || 'Platform',
          link.url || '#',
          link.icon || '📱',
          link.is_available !== false ? 1 : 0
        ]
      );
    }
    console.log(`✅ ${mongoSocial.length} liens sociaux LTDM migrés`);
    
    // 4. MIGRATION PRODUITS LTDM
    console.log('🛍️ Migration produits LTDM...');
    const mongoProducts = await db.collection('products').find({}).toArray();
    console.log(`📊 ${mongoProducts.length} produits trouvés dans MongoDB`);
    
    for (const product of mongoProducts) {
      console.log(`🛍️ Migration produit: ${product.name}`);
      
      // Trouver les IDs des catégories et farms
      let category_id = 1;
      let farm_id = 1;
      
      if (product.category) {
        const catResult = await executeSqlOnD1('SELECT id FROM categories WHERE name = ?', [product.category]);
        if (catResult.success && catResult.result?.[0]?.results?.[0]) {
          category_id = catResult.result[0].results[0].id;
        }
      }
      
      if (product.farm) {
        const farmResult = await executeSqlOnD1('SELECT id FROM farms WHERE name = ?', [product.farm]);
        if (farmResult.success && farmResult.result?.[0]?.results?.[0]) {
          farm_id = farmResult.result[0].results[0].id;
        }
      }
      
      await executeSqlOnD1(
        'INSERT INTO products (name, description, category_id, farm_id, image_url, video_url, price, stock, prices, is_available, features, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          product.name || 'Produit LTDM',
          product.description || 'Produit LTDM.3.0 de qualité',
          category_id,
          farm_id,
          product.image || product.image_url || '',
          product.video || product.video_url || '',
          Number(product.price || 0),
          Number(product.stock || 10),
          JSON.stringify(product.prices || {}),
          product.is_available !== false ? 1 : 0,
          JSON.stringify(product.features || {}),
          JSON.stringify(product.tags || [])
        ]
      );
    }
    console.log(`✅ ${mongoProducts.length} produits LTDM migrés`);
    
    // 5. MIGRATION SETTINGS LTDM
    console.log('⚙️ Migration settings LTDM...');
    const mongoSettings = await db.collection('settings').findOne({});
    
    if (mongoSettings) {
      console.log('⚙️ Settings trouvés, mise à jour...');
      await executeSqlOnD1(
        'UPDATE settings SET shop_title = ?, theme_color = ?, background_image = ?, background_opacity = ?, background_blur = ?, info_content = ?, contact_content = ?, whatsapp_link = ?, whatsapp_number = ?, scrolling_text = ? WHERE id = 1',
        [
          mongoSettings.shop_title || 'LTDM.3.0',
          mongoSettings.theme_color || 'glow',
          mongoSettings.background_image || null,
          mongoSettings.background_opacity || 20,
          mongoSettings.background_blur || 5,
          mongoSettings.info_content || '',
          mongoSettings.contact_content || '',
          mongoSettings.whatsapp_link || '',
          mongoSettings.whatsapp_number || '',
          mongoSettings.scrolling_text || ''
        ]
      );
    } else {
      console.log('⚙️ Aucun settings trouvé, création par défaut...');
      await executeSqlOnD1(
        'INSERT OR REPLACE INTO settings (id, shop_title, theme_color, background_opacity, background_blur) VALUES (?, ?, ?, ?, ?)',
        [1, 'LTDM.3.0', 'glow', 20, 5]
      );
    }
    console.log('✅ Settings LTDM migrés');
    
    // 6. MIGRATION PAGES LTDM
    console.log('📄 Migration pages LTDM...');
    const mongoPages = await db.collection('pages').find({}).toArray();
    console.log(`📊 ${mongoPages.length} pages trouvées dans MongoDB`);
    
    for (const page of mongoPages) {
      console.log(`📄 Migration page: ${page.slug}`);
      await executeSqlOnD1(
        'INSERT OR REPLACE INTO pages (slug, title, content, is_active) VALUES (?, ?, ?, ?)',
        [
          page.slug || 'page',
          page.title || 'Page LTDM',
          page.content || '',
          page.is_active !== false ? 1 : 0
        ]
      );
    }
    console.log(`✅ ${mongoPages.length} pages LTDM migrées`);
    
    console.log('🎉 Migration LTDM MongoDB → D1 terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur migration LTDM:', error);
  } finally {
    await client.close();
  }
}

migrateLTDMData();