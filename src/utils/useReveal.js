import { useCallback, useRef, useState } from 'react';

// Detecta cuándo un elemento entra en pantalla al hacer scroll, para animarlo con
// CSS (ver clases .reveal / .reveal-visible en index.css). Una vez que aparece se
// deja de observar: es una revelación de una sola vez, no un toggle constante.
//
// Usa un callback ref (no useRef + useEffect) a propósito: varios componentes que
// llaman a este hook (ej. AntojoDelDia) renderizan `null` mientras cargan datos y
// recién montan la sección observada en un render posterior. Con useEffect(cb, [])
// ese efecto corre una sola vez, en el primer render, cuando el nodo todavía no
// existe — el observer nunca llegaba a engancharse. El callback ref sí se vuelve a
// invocar cada vez que el nodo se monta, sin importar en qué render pase.
export function useReveal() {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback((el) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return [ref, visible];
}
