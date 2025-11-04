import DOMPurify from "isomorphic-dompurify";

/**
 * SIKKERHET: Sanitize HTML content for å forhindre XSS
 * 
 * Brukes for:
 * - Blog post innhold (fra TipTap editor)
 * - Bruker-generert innhold
 * 
 * Tillater kun sikre HTML tags og attributter.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    
    // Tillatte tags (fra TipTap editor)
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre', 'img', 'table', 'thead', 
      'tbody', 'tr', 'th', 'td', 'caption', 'col', 'colgroup',
      'div', 'span', 'hr', 'sup', 'sub', 's', 'del', 'ins',
      'mark', 'small', 'abbr', 'cite', 'q', 'time', 'var',
      'kbd', 'samp', 'address', 'figcaption', 'figure',
    ],
    
    // Tillatte attributter
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 
      'class', 'style', 'target', 'rel', 'id', 'name',
      'colspan', 'rowspan', 'scope', 'align', 'valign',
      'datetime', 'cite', 'lang', 'dir',
    ],
    
    // Sikre attributt-verdier
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    
    // Tillat bare safe URIs
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    
    // Fjern skadelige tags
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    
    // Sørg for at links åpnes sikkert
    ADD_ATTR: ['rel'],
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
    
    // For tabeller og lister
    IN_PLACE: false,
  });
}
