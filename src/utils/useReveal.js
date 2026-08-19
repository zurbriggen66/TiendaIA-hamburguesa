import { useEffect, useRef, useState } from 'react';

// Detecta cuándo un elemento entra en pantalla al hacer scroll, para animarlo con
// CSS (ver clases .reveal / .reveal-visible en index.css). Una vez que aparece se
// deja de observar: es una revelación de una sola vez, no un toggle constante.
export function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Sin animación si el usuario prefiere menos movimiento, o si el navegador no
    // soporta IntersectionObserver: aparece directo, sin bloquear nada.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}
