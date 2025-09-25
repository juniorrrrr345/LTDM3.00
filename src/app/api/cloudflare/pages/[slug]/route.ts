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

// GET - Récupérer une page par slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const result = await executeSqlOnD1('SELECT * FROM pages WHERE slug = ? LIMIT 1', [params.slug]);
    
    if (result.result?.[0]?.results?.length) {
      const page = result.result[0].results[0];
      console.log(`📄 Page ${params.slug} récupérée:`, page.title);
      return NextResponse.json(page);
    } else {
      // Retourner du contenu par défaut selon le slug
      let defaultContent = '';
      let defaultTitle = '';
      
      switch (params.slug) {
        case 'info':
          defaultTitle = 'À propos d\'LTDM.3.0';
          defaultContent = 'Bienvenue chez LTDM.3.0 - Votre boutique premium de produits d\'exception.';
          break;
        case 'contact':
          defaultTitle = 'Contact LTDM.3.0';
          defaultContent = 'Contactez-nous pour toute question concernant nos produits LTDM.3.0.';
          break;
        default:
          defaultTitle = 'Page LTDM.3.0';
          defaultContent = 'Contenu de la page LTDM.3.0.';
      }
      
      const defaultPage = {
        id: 0,
        slug: params.slug,
        title: defaultTitle,
        content: defaultContent
      };
      
      console.log(`📄 Page ${params.slug} récupérée:`, defaultTitle);
      return NextResponse.json(defaultPage);
    }
  } catch (error) {
    console.error(`❌ Erreur récupération page ${params.slug}:`, error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une page
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { title, content } = body;

    // Vérifier si la page existe
    const checkResult = await executeSqlOnD1('SELECT id FROM pages WHERE slug = ?', [params.slug]);
    
    if (checkResult.result?.[0]?.results?.length) {
      // UPDATE
      await executeSqlOnD1(
        'UPDATE pages SET title = ?, content = ? WHERE slug = ?',
        [title, content, params.slug]
      );
    } else {
      // INSERT
      await executeSqlOnD1(
        'INSERT INTO pages (slug, title, content, is_active) VALUES (?, ?, ?, ?)',
        [params.slug, title, content, 1]
      );
    }

    // Récupérer la page mise à jour
    const result = await executeSqlOnD1('SELECT * FROM pages WHERE slug = ?', [params.slug]);
    
    if (result.result?.[0]?.results?.length) {
      const page = result.result[0].results[0];
      console.log(`✅ Page ${params.slug} mise à jour:`, page.title);
      return NextResponse.json(page);
    } else {
      return NextResponse.json({ success: true, message: 'Page mise à jour' });
    }
  } catch (error) {
    console.error(`❌ Erreur mise à jour page ${params.slug}:`, error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une page
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await executeSqlOnD1('DELETE FROM pages WHERE slug = ?', [params.slug]);
    
    return NextResponse.json({ success: true, message: 'Page supprimée avec succès' });
  } catch (error) {
    console.error(`❌ Erreur suppression page ${params.slug}:`, error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression' },
      { status: 500 }
    );
  }
}