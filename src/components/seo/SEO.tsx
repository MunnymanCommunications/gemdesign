import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string; // absolute or path
  structuredData?: object | object[];
}

const SEO = ({ title, description, canonical, structuredData }: SEOProps) => {
  useEffect(() => {
    // Title
    if (title) {
      document.title = title;
    }

    // Meta description
    if (description !== undefined) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'description');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', description || '');
    }

    // Canonical link
    if (canonical) {
      const href = canonical.startsWith('http')
        ? canonical
        : `${window.location.origin}${canonical}`;
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    }

    // Structured data (JSON-LD)
    const removeExisting = () => {
      const nodes = document.querySelectorAll('script[data-seo-json-ld]');
      nodes.forEach((n) => n.parentElement?.removeChild(n));
    };

    removeExisting();

    if (structuredData) {
      const items = Array.isArray(structuredData) ? structuredData : [structuredData];
      items.forEach((obj) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-json-ld', 'true');
        script.text = JSON.stringify(obj);
        document.head.appendChild(script);
      });
    }

    return () => {
      // do not remove title/meta on unmount to preserve navigation history titles
    };
  }, [title, description, canonical, structuredData]);

  return null;
};

export default SEO;
