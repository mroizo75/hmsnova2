import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Brukes for blog posts og annet brukergenerert HTML-innhold
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    // Tillatte tags (TipTap-kompatible)
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'mark',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Images
      'img',
      // Quotes
      'blockquote',
      // Code blocks
      'pre',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Divs for layout (med begrensninger)
      'div', 'span',
      // Horizontal rule
      'hr',
    ],
    // Tillatte attributter
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 
      'target', 'rel', // For lenker
      'width', 'height', // For bilder
      'colspan', 'rowspan', // For tabeller
      'style', // Tillat style, men med begrensninger
    ],
    // Tillatte CSS-egenskaper (for inline styles)
    ALLOWED_CSS_PROPERTIES: [
      'color', 'background-color', 'text-align',
      'font-size', 'font-weight', 'font-family',
      'text-decoration', 'padding', 'margin',
      'border', 'border-color', 'border-width',
    ],
    // Tillat data-attributes (for TipTap)
    ALLOW_DATA_ATTR: false,
    // Ikke tillat ukjente protokoller
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Sett rel="noopener noreferrer" på eksterne lenker
    ADD_ATTR: ['target'],
    // Hook for å legge til rel="noopener noreferrer" på eksterne lenker
    SAFE_FOR_TEMPLATES: true,
  });
}

/**
 * Sanitize HTML og legg til sikkerhet på eksterne lenker
 */
export function sanitizeHtmlWithExternalLinks(html: string): string {
  const sanitized = sanitizeHtml(html);
  
  // Bruk DOMParser for å manipulere DOM
  if (typeof window !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');
    
    // Legg til rel="noopener noreferrer" på alle eksterne lenker
    const links = doc.querySelectorAll('a[href]');
    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        const currentDomain = window.location.hostname;
        try {
          const linkDomain = new URL(href).hostname;
          if (linkDomain !== currentDomain) {
            link.setAttribute('rel', 'noopener noreferrer');
            link.setAttribute('target', '_blank');
          }
        } catch (e) {
          // Ugyldig URL, ignorer
        }
      }
    });
    
    return doc.body.innerHTML;
  }
  
  return sanitized;
}

/**
 * Enkel tekst-ekstraksjon (fjern alle tags)
 * Nyttig for previews og excerpts
 */
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize for JSON-LD (structured data)
 * Mer restriktiv enn vanlig HTML sanitization
 */
export function sanitizeForJsonLd(text: string): string {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  })
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\n/g, ' ') // Replace newlines
    .trim();
}

