import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

/**
 * Costo por unidad editable en la propia tarjeta.
 *
 * Es el dato que más cambia (los precios de los proveedores se mueven todo el tiempo) y
 * el que alimenta todo el Balance. Mandarlo a un modal por cada corrección hacía que
 * nadie lo actualizara, y un costo viejo hace ver los productos más rentables de lo que
 * son sin que nada avise.
 */
export default function CostoRapido({ insumo, onGuardado }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editando) inputRef.current?.select();
  }, [editando]);

  const abrir = (e) => {
    // La tarjeta entera abre el modal de edición: sin esto, tocar el costo abriría
    // las dos cosas a la vez.
    e.stopPropagation();
    setValor(insumo.costo_unitario === null ? '' : String(insumo.costo_unitario));
    setEditando(true);
  };

  const guardar = async () => {
    const nuevo = Number(valor);
    if (valor.trim() === '' || Number.isNaN(nuevo) || nuevo < 0) {
      toast.alerta('Poné cuánto te cuesta una unidad.');
      return;
    }
    // Sin cambios no se manda nada: evita una request por cada vez que se toca sin querer.
    if (insumo.costo_unitario !== null && nuevo === Number(insumo.costo_unitario)) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      await api.patch(`/insumos/${insumo.id}/`, { costo_manual: nuevo });
      toast.exito(`${insumo.nombre}: ${formatearPrecio(nuevo)} por ${insumo.unidad.replace(/s$/, '')}.`);
      setEditando(false);
      onGuardado();
    } catch (error) {
      console.error('Error al guardar el costo:', error);
      toast.error(error.response?.data?.costo_manual?.[0] || 'No se pudo guardar el costo.');
    } finally {
      setGuardando(false);
    }
  };

  if (!editando) {
    return (
      <button type="button" className="stock-costo-boton" onClick={abrir} title="Tocá para cambiar el costo">
        {insumo.costo_unitario === null
          ? '⚠️ sin costo'
          : `${formatearPrecio(insumo.costo_unitario)} c/${insumo.unidad.replace(/s$/, '')}`}
        <span className="stock-costo-lapiz" aria-hidden="true"> ✎</span>
      </button>
    );
  }

  return (
    <div className="stock-costo-editor" onClick={(e) => e.stopPropagation()}>
      <span className="stock-costo-simbolo">$</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        className="stock-costo-input"
        value={valor}
        disabled={guardando}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); guardar(); }
          if (e.key === 'Escape') setEditando(false);
        }}
        // Guardar al salir del campo: tocar afuera es la forma natural de terminar,
        // y obligar a apretar un botón hacía perder el cambio recién escrito.
        onBlur={guardar}
        aria-label={`Costo por ${insumo.unidad}`}
      />
    </div>
  );
}
