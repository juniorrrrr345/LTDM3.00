import { NextResponse } from 'next/server';

// Configuration Cloudflare D1 hardcodée
const CLOUDFLARE_CONFIG = {
  accountId: '7979421604bd07b3bd34d3ed96222512',
  databaseId: 'f65b4d99-d786-49a6-ac1a-8f58da52624c',
  apiToken: 'ijkVhaXCw6LSddIMIMxwPL5CDAWznxip5x9I1bNW'
};

async function executeSqlOnD1(sql, params = []) {
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

// GET - Récupérer toutes les pages
export async function GET() {
  try {
    const result = await executeSqlOnD1('SELECT * FROM pages ORDER BY created_at DESC');
    
    if (result.result?.[0]?.results) {
      console.log(`📄 Pages récupérées: ${result.result[0].results.length}`);
      return NextResponse.json(result.result[0].results);
    } else {
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Erreur récupération pages:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des pages' },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle page
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, title, content = '', is_active = true } = body;

    if (!slug || !title) {
      return NextResponse.json(
        { error: 'Le slug et le titre sont requis' },
        { status: 400 }
      );
    }

    await executeSqlOnD1(
      'INSERT INTO pages (slug, title, content, is_active) VALUES (?, ?, ?, ?)',
      [slug, title, content, is_active ? 1 : 0]
    );

    console.log('✅ Page créée avec succès');
    return NextResponse.json({ success: true, message: 'Page créée avec succès' }, { status: 201 });
  } catch (error) {
    console.error('Erreur création page:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la page' },
      { status: 500 }
    );
  }
}