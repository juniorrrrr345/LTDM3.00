const { MongoClient } = require('mongodb');

// CONNEXION MONGODB LTDM
const MONGODB_URI = 'mongodb+srv://LTDM:lX94uMAUu5KdIZpF@cluster0.giuejd7.mongodb.net/ltdm30_shop?retryWrites=true&w=majority';
const MONGODB_DB_NAME = 'ltdm30_shop';

const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: 'f65b4d99-d786-49a6-ac1a-8f58da52624c',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

// Fonction pour nettoyer les URLs
function cleanUrl(url) {
  if (!url) return '';
  return String(url).trim();
}

// Fonction pour nettoyer les caractères spéciaux
function cleanString(str) {
  if (!str) return '';
  return String(str)
    .replace(/[^\x20-\x7E]/g, '') // Garder seulement les caractères ASCII imprimables
    .replace(/'/g, "''") // Échapper les apostrophes pour SQL
    .trim();
}

async function executeSqlOnD1(sql, params = []) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  // Nettoyer les paramètres
  const cleanParams = params.map(param => {
    if (typeof param === 'string') {
      return cleanString(param);
    }
    return param;
  });
  
  const curlCmd = `curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/d1/database/${CLOUDFLARE_CONFIG.databaseId}/query" \\
    -H "Authorization: Bearer ${CLOUDFLARE_CONFIG.apiToken}" \\
    -H "Content-Type: application/json" \\
    --data '{"sql": "${sql}", "params": ${JSON.stringify(cleanParams)}}'`;
  
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
    
    console.log('🔄 Migration LTDM depuis MongoDB (version robuste)...');
    
    // 1. MIGRATION CATÉGORIES LTDM
    console.log('📁 Migration catégories LTDM...');
    const mongoCategories = await db.collection('categories').find({}).toArray();
    console.log(`📊 ${mongoCategories.length} catégories trouvées dans MongoDB`);
    
    for (const cat of mongoCategories) {
      const cleanName = cleanString(cat.name) || 'Catégorie LTDM';
      const cleanIcon = cleanString(cat.icon || cat.emoji) || '📦';
      const cleanColor = cleanString(cat.color) || '#22C55E';
      
      console.log(`📁 Migration catégorie: ${cleanName}`);
      await executeSqlOnD1(
        'INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)',
        [cleanName, cleanIcon, cleanColor]
      );
    }
    console.log(`✅ ${mongoCategories.length} catégories LTDM migrées`);
    
    // 2. MIGRATION FARMS LTDM
    console.log('🏪 Migration farms LTDM...');
    const mongoFarms = await db.collection('farms').find({}).toArray();
    console.log(`📊 ${mongoFarms.length} farms trouvées dans MongoDB`);
    
    for (const farm of mongoFarms) {
      const cleanName = cleanString(farm.name) || 'Farm LTDM';
      const cleanDesc = cleanString(farm.description) || 'Production LTDM.3.0';
      const cleanLocation = cleanString(farm.location || farm.country) || 'Local';
      const cleanContact = cleanString(farm.contact) || 'contact@ltdm.com';
      
      console.log(`🏪 Migration farm: ${cleanName}`);
      await executeSqlOnD1(
        'INSERT INTO farms (name, description, location, contact) VALUES (?, ?, ?, ?)',
        [cleanName, cleanDesc, cleanLocation, cleanContact]
      );
    }
    console.log(`✅ ${mongoFarms.length} farms LTDM migrées`);
    
    // 3. MIGRATION LIENS SOCIAUX LTDM
    console.log('📱 Migration liens sociaux LTDM...');
    const mongoSocial = await db.collection('socialLinks').find({}).toArray();
    console.log(`📊 ${mongoSocial.length} liens sociaux trouvés dans MongoDB`);
    
    for (const link of mongoSocial) {
      const cleanPlatform = cleanString(link.name || link.platform) || 'Platform';
      const cleanUrlValue = cleanUrl(link.url) || '#';
      const cleanIcon = cleanString(link.icon) || '📱';
      
      console.log(`📱 Migration lien: ${cleanPlatform}`);
      await executeSqlOnD1(
        'INSERT INTO social_links (platform, url, icon, is_available) VALUES (?, ?, ?, ?)',
        [cleanPlatform, cleanUrlValue, cleanIcon, link.is_available !== false ? 1 : 0]
      );
    }
    console.log(`✅ ${mongoSocial.length} liens sociaux LTDM migrés`);
    
    // 4. MIGRATION PRODUITS LTDM
    console.log('🛍️ Migration produits LTDM...');
    const mongoProducts = await db.collection('products').find({}).toArray();
    console.log(`📊 ${mongoProducts.length} produits trouvés dans MongoDB`);
    
    for (const product of mongoProducts) {
      const cleanName = cleanString(product.name) || 'Produit LTDM';
      const cleanDesc = cleanString(product.description) || 'Produit LTDM.3.0 de qualité';
      
      console.log(`🛍️ Migration produit: ${cleanName}`);
      
      // Trouver les IDs des catégories et farms
      let category_id = 1;
      let farm_id = 1;
      
      if (product.category) {
        const cleanCategory = cleanString(product.category);
        const catResult = await executeSqlOnD1('SELECT id FROM categories WHERE name = ?', [cleanCategory]);
        if (catResult.success && catResult.result?.[0]?.results?.[0]) {
          category_id = catResult.result[0].results[0].id;
        }
      }
      
      if (product.farm) {
        const cleanFarm = cleanString(product.farm);
        const farmResult = await executeSqlOnD1('SELECT id FROM farms WHERE name = ?', [cleanFarm]);
        if (farmResult.success && farmResult.result?.[0]?.results?.[0]) {
          farm_id = farmResult.result[0].results[0].id;
        }
      }
      
      const cleanImageUrl = cleanUrl(product.image || product.image_url);
      const cleanVideoUrl = cleanUrl(product.video || product.video_url);
      const cleanPrices = JSON.stringify(product.prices || {});
      const cleanFeatures = JSON.stringify(product.features || {});
      const cleanTags = JSON.stringify(product.tags || []);
      
      await executeSqlOnD1(
        'INSERT INTO products (name, description, category_id, farm_id, image_url, video_url, price, stock, prices, is_available, features, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          cleanName,
          cleanDesc,
          category_id,
          farm_id,
          cleanImageUrl,
          cleanVideoUrl,
          Number(product.price || 0),
          Number(product.stock || 10),
          cleanPrices,
          product.is_available !== false ? 1 : 0,
          cleanFeatures,
          cleanTags
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
          cleanString(mongoSettings.shop_title) || 'LTDM.3.0',
          cleanString(mongoSettings.theme_color) || 'glow',
          cleanUrl(mongoSettings.background_image),
          mongoSettings.background_opacity || 20,
          mongoSettings.background_blur || 5,
          cleanString(mongoSettings.info_content) || '',
          cleanString(mongoSettings.contact_content) || '',
          cleanUrl(mongoSettings.whatsapp_link),
          cleanString(mongoSettings.whatsapp_number) || '',
          cleanString(mongoSettings.scrolling_text) || ''
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
      const cleanSlug = cleanString(page.slug) || 'page';
      const cleanTitle = cleanString(page.title) || 'Page LTDM';
      const cleanContent = cleanString(page.content) || '';
      
      console.log(`📄 Migration page: ${cleanSlug}`);
      await executeSqlOnD1(
        'INSERT OR REPLACE INTO pages (slug, title, content, is_active) VALUES (?, ?, ?, ?)',
        [cleanSlug, cleanTitle, cleanContent, page.is_active !== false ? 1 : 0]
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