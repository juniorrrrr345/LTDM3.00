// Cache global optimisé pour Cloudflare D1
import d1Client from './cloudflare-d1';

interface CachedData {
  settings?: any;
  infoPage?: any;
  contactPage?: any;
  socialLinks?: any[];
  products?: any[];
  categories?: any[];
  farms?: any[];
  pages?: {
    info?: { title: string; content: string };
    contact?: { title: string; content: string };
  };
}

class ContentCache {
  private data: any = {};
  private lastUpdate: number = 0;
  private cacheDuration: number = 300000; // 5 minutes - Optimisé
  private isRefreshing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Charger immédiatement depuis l'API Cloudflare
      this.forceRefresh();
      // Rafraîchir optimisé pour performance
      setInterval(() => this.forceRefresh(), 300000); // Toutes les 5 minutes - Optimisé
    }
  }
  
  async initialize() {
    if (this.needsRefresh()) {
      await this.forceRefresh();
    }
  }

  needsRefresh(): boolean {
    return Date.now() - this.lastUpdate > this.cacheDuration;
  }

  async forceRefresh() {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    try {
      console.log('🔄 Rafraîchissement cache Cloudflare D1...');
      
      // Charger depuis les routes API Cloudflare avec cache no-store
      const [settingsRes, productsRes, categoriesRes, farmsRes, socialLinksRes, pagesRes] = await Promise.allSettled([
        fetch('/api/cloudflare/settings', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        fetch('/api/products-simple', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
        fetch('/api/categories-simple', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
        fetch('/api/farms-simple', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
        fetch('/api/cloudflare/social-links', { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
        fetch('/api/cloudflare/pages', { cache: 'no-store' }).then(r => r.ok ? r.json() : [])
      ]);

      // Extraire les résultats
      const settings = settingsRes.status === 'fulfilled' ? settingsRes.value : this.getDefaultSettings();
      const products = productsRes.status === 'fulfilled' ? productsRes.value : [];
      const categories = categoriesRes.status === 'fulfilled' ? categoriesRes.value : [];
      const farms = farmsRes.status === 'fulfilled' ? farmsRes.value : [];
      const socialLinks = socialLinksRes.status === 'fulfilled' ? socialLinksRes.value : [];
      const pages = pagesRes.status === 'fulfilled' ? pagesRes.value : [];

      // Organiser les pages
      const infoPage = pages.find((p: any) => p.slug === 'info') || { title: 'Informations', content: 'Bienvenue dans notre boutique !' };
      const contactPage = pages.find((p: any) => p.slug === 'contact') || { title: 'Contact', content: 'Contactez-nous pour toute question.' };

      this.data = {
        settings,
        products,
        categories,
        farms,
        socialLinks,
        infoPage,
        contactPage,
        pages: {
          info: infoPage,
          contact: contactPage
        }
      };

      this.lastUpdate = Date.now();
      console.log('✅ Cache Cloudflare D1 mis à jour');
    } catch (error) {
      console.error('❌ Erreur refresh cache D1:', error);
      // Garder les données existantes en cas d'erreur
    } finally {
      this.isRefreshing = false;
    }
  }

  getDefaultSettings() {
    return {
      shopName: 'LTDM.3.0',
      shopDescription: 'Boutique en ligne moderne',
      backgroundImage: '',
      backgroundOpacity: 20,
      backgroundBlur: 5,
      themeColor: '#000000',
      contactInfo: 'Contactez-nous pour plus d\'informations',
      loadingEnabled: true,
      loadingDuration: 3000
    };
  }

  // Getters pour accéder aux données
  getSettings() {
    return this.data.settings || this.getDefaultSettings();
  }

  getProducts() {
    return this.data.products || [];
  }

  getCategories() {
    return this.data.categories || [];
  }

  getFarms() {
    return this.data.farms || [];
  }

  getSocialLinks() {
    return this.data.socialLinks || [];
  }

  getInfoPage() {
    return this.data.infoPage || { title: 'Informations', content: 'Bienvenue dans notre boutique !' };
  }

  getContactPage() {
    return this.data.contactPage || { title: 'Contact', content: 'Contactez-nous pour toute question.' };
  }

  getPages() {
    return this.data.pages || {
      info: this.getInfoPage(),
      contact: this.getContactPage()
    };
  }

  // Méthodes pour invalider le cache
  invalidateSettings() {
    delete this.data.settings;
  }

  invalidateProducts() {
    delete this.data.products;
  }

  invalidateAll() {
    this.data = {};
    this.lastUpdate = 0;
  }
}

// Instance globale
const contentCache = new ContentCache();
export default contentCache;
export { contentCache };