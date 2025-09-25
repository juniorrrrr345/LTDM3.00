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

// GET - Récupérer un lien social par ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const result = await executeSqlOnD1('SELECT * FROM social_links WHERE id = ?', [id]);
    
    if (!result.result?.[0]?.results?.length) {
      return NextResponse.json(
        { error: 'Lien social non trouvé' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.result[0].results[0]);
  } catch (error) {
    console.error('Erreur récupération lien social:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un lien social
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { platform, url, icon, is_available } = body;

    await executeSqlOnD1(
      'UPDATE social_links SET platform = ?, url = ?, icon = ?, is_available = ? WHERE id = ?',
      [platform, url, icon || '🔗', is_available ? 1 : 0, id]
    );

    // Récupérer le lien social mis à jour
    const result = await executeSqlOnD1('SELECT * FROM social_links WHERE id = ?', [id]);
    
    return NextResponse.json(result.result[0].results[0]);
  } catch (error) {
    console.error('Erreur mise à jour lien social:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un lien social
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Supprimer le lien social
    await executeSqlOnD1('DELETE FROM social_links WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true, message: 'Lien social supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression lien social:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la suppression' },
      { status: 500 }
    );
  }
}