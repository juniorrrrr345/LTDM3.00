import { NextRequest, NextResponse } from 'next/server';

// Configuration Cloudflare D1 hardcodée
const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: 'f65b4d99-d786-49a6-ac1a-8f58da52624c',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

async function executeSqlOnD1(sql: string, params: any[] = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/d1/database/${CLOUDFLARE_CONFIG.databaseId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  
  if (!response.ok) {
    throw new Error(`D1 Error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

// GET - Récupérer les paramètres
export async function GET() {
  try {
    console.log('🔍 GET settings LTDM.3.0...');
    
    const result = await executeSqlOnD1('SELECT * FROM settings WHERE id = 1');
    
    if (result.result?.[0]?.results?.length) {
      const settings = result.result[0].results[0];
      console.log('✅ Settings LTDM.3.0 récupérés:', settings);
      
      // Mapper les champs D1 vers le format attendu par le frontend
      const mappedSettings = {
        ...settings,
        backgroundImage: settings.background_image,
        backgroundOpacity: settings.background_opacity || 20,
        backgroundBlur: settings.background_blur || 5,
        shopTitle: settings.shop_title || 'LTDM.3.0',
        shopName: settings.shop_title || 'LTDM.3.0',
        infoContent: settings.info_content,
        contactContent: settings.contact_content,
        whatsappLink: settings.whatsapp_link || '',
        whatsappNumber: settings.whatsapp_number || '',
        scrollingText: settings.scrolling_text || '',
        titleStyle: settings.theme_color || 'glow'
      };
      
      return NextResponse.json(mappedSettings);
    } else {
      // Retourner des paramètres par défaut LTDM.3.0
      const defaultSettings = {
        id: 1,
        shop_name: 'LTDM.3.0',
        background_image: 'https://pub-b38679a01a274648827751df94818418.r2.dev/images/background-oglegacy.jpeg',
        background_opacity: 20,
        background_blur: 5,
        info_content: 'Bienvenue chez LTDM.3.0 - Votre boutique premium',
        contact_content: 'Contactez LTDM.3.0 pour toute question',
        backgroundImage: 'https://pub-b38679a01a274648827751df94818418.r2.dev/images/background-oglegacy.jpeg',
        backgroundOpacity: 20,
        backgroundBlur: 5,
        shopTitle: 'LTDM.3.0',
        shopName: 'LTDM.3.0'
      };
      
      return NextResponse.json(defaultSettings);
    }
  } catch (error) {
    console.error('❌ Erreur GET settings LTDM.3.0:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour les paramètres (pour compatibilité)
export async function POST(request: NextRequest) {
  return PUT(request);
}

// PUT - Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    console.log('🔧 PUT settings LTDM.3.0...');
    const body = await request.json();
    
    const {
      background_image,
      backgroundImage,
      background_opacity,
      backgroundOpacity,
      background_blur,
      backgroundBlur,
      info_content,
      infoContent,
      contact_content,
      contactContent,
      shop_title,
      shopTitle,
      whatsapp_link,
      whatsappLink,
      whatsapp_number,
      whatsappNumber,
      scrolling_text,
      scrollingText,
      theme_color,
      titleStyle
    } = body;

    // Utiliser les champs avec priorité aux versions snake_case
    const finalBackgroundImage = background_image || backgroundImage;
    const finalBackgroundOpacity = background_opacity ?? backgroundOpacity ?? 20;
    const finalBackgroundBlur = background_blur ?? backgroundBlur ?? 5;
    const finalInfoContent = info_content || infoContent || 'Bienvenue chez LTDM.3.0';
    const finalContactContent = contact_content || contactContent || 'Contactez LTDM.3.0';
    const finalShopTitle = shop_title || shopTitle || 'LTDM.3.0';
    const finalWhatsappLink = whatsapp_link || whatsappLink || '';
    const finalWhatsappNumber = whatsapp_number || whatsappNumber || '';
    const finalScrollingText = scrolling_text || scrollingText || '';
    const finalThemeColor = theme_color || titleStyle || 'glow';

    // Vérifier si un enregistrement existe
    const checkResult = await executeSqlOnD1('SELECT id FROM settings WHERE id = 1');
    
    if (checkResult.result?.[0]?.results?.length) {
      // UPDATE
      await executeSqlOnD1(`
        UPDATE settings SET 
          background_image = ?, 
          background_opacity = ?, 
          background_blur = ?,
          info_content = ?,
          contact_content = ?,
          shop_title = ?,
          whatsapp_link = ?,
          whatsapp_number = ?,
          scrolling_text = ?,
          theme_color = ?
        WHERE id = 1
      `, [
        finalBackgroundImage,
        finalBackgroundOpacity,
        finalBackgroundBlur,
        finalInfoContent,
        finalContactContent,
        finalShopTitle,
        finalWhatsappLink,
        finalWhatsappNumber,
        finalScrollingText,
        finalThemeColor
      ]);
    } else {
      // INSERT
      await executeSqlOnD1(`
        INSERT INTO settings (
          id, background_image, background_opacity, background_blur, 
          info_content, contact_content, shop_title, whatsapp_link,
          whatsapp_number, scrolling_text, theme_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1,
        finalBackgroundImage,
        finalBackgroundOpacity,
        finalBackgroundBlur,
        finalInfoContent,
        finalContactContent,
        finalShopTitle,
        finalWhatsappLink,
        finalWhatsappNumber,
        finalScrollingText,
        finalThemeColor
      ]);
    }

    // Récupérer les paramètres mis à jour
    const result = await executeSqlOnD1('SELECT * FROM settings WHERE id = 1');
    const settings = result.result[0].results[0];
    
    console.log('✅ Settings LTDM.3.0 mis à jour:', settings);

    const mappedSettings = {
      ...settings,
      backgroundImage: settings.background_image,
      backgroundOpacity: settings.background_opacity,
      backgroundBlur: settings.background_blur,
      shopTitle: 'LTDM.3.0',
      shopName: 'LTDM.3.0'
    };

    return NextResponse.json(mappedSettings);
  } catch (error) {
    console.error('❌ Erreur PUT settings LTDM.3.0:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour des paramètres' },
      { status: 500 }
    );
  }
}