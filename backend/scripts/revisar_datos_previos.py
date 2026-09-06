"""Revisa, SIN ESCRIBIR NADA, qué va a mostrar el sistema nuevo con los datos que ya
existen. Se corre en la VPS después de migrar y antes de publicar el frontend.

Los campos nuevos (vuelto cruzado, arqueo, movimientos manuales, costo a mano) quedan
en su default sobre los datos viejos, y esos defaults reproducen el comportamiento
anterior. Lo que sí cambia es que pantallas nuevas van a mostrar cosas que antes no se
veían: si un turno viejo tenía plata que no cerraba, el descuadre estuvo siempre ahí,
pero recién ahora se ve.

Este script dice exactamente en qué turnos va a pasar eso, para que nadie se sorprenda
con un número raro con el local abierto.

    cd /opt/tienda-ia/ANTOJO-BACK && python scripts/revisar_datos_previos.py
"""
import os
import sys
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django  # noqa: E402

django.setup()

from gastos.models import Gasto  # noqa: E402
from pedidos.models import Caja  # noqa: E402


def money(valor):
    return f'${valor:,.2f}'.replace(',', '.')


def main():
    print('=' * 72)
    print('REVISION DE DATOS PREVIOS — no modifica nada')
    print('=' * 72)

    cajas = Caja.objects.prefetch_related(
        'pedidos__items__extras', 'pedidos__pagos', 'gastos', 'movimientos_manuales',
    ).order_by('dia')
    print(f'\n{cajas.count()} caja(s) en la base.\n')

    con_descuadre = []
    con_negativo = []
    for caja in cajas:
        descuadre = caja.descuadre_efectivo()
        if descuadre > 0:
            con_descuadre.append((caja, descuadre))
        negativos = [
            (metodo, saldo) for metodo, saldo in caja.desglose_por_metodo().items()
            if saldo < 0 and metodo != 'efectivo'
        ]
        if negativos:
            con_negativo.append((caja, negativos))

    # 1) Turnos donde las salidas superan lo que entro en efectivo. La pantalla va a
    #    mostrar $0 con un aviso, no un negativo. El dato ya estaba mal antes; lo unico
    #    nuevo es que ahora se ve.
    print('-' * 72)
    if con_descuadre:
        print(f'{len(con_descuadre)} turno(s) donde el efectivo registrado no cierra.')
        print('La caja va a mostrar $0 y el aviso "las salidas superan lo que entro".')
        print('Se arregla registrando el ingreso de efectivo que falta, o destildando')
        print('"salio del cajon" en el gasto que no salio de ahi.\n')
        for caja, monto in con_descuadre:
            print(f'   {caja.dia}  faltan {money(monto)}')
    else:
        print('OK: ningun turno queda con el efectivo en descuadre.')

    # 2) Saldos negativos fuera del efectivo. Casi siempre es un vuelto devuelto por esa
    #    via; en datos viejos no deberia aparecer, porque el vuelto cruzado no se podia
    #    registrar antes.
    print('\n' + '-' * 72)
    if con_negativo:
        print(f'{len(con_negativo)} turno(s) con un saldo negativo fuera del efectivo:')
        for caja, negativos in con_negativo:
            detalle = ', '.join(f'{m} {money(s)}' for m, s in negativos)
            print(f'   {caja.dia}  {detalle}')
    else:
        print('OK: ningun saldo negativo fuera del efectivo.')

    # 3) Gastos que cambian de comportamiento. Antes se descontaba TODO gasto del turno
    #    de su propio metodo; ahora solo los marcados como salidos del cajon. La
    #    migracion de datos marco los de efectivo para no mover los arqueos ya contados,
    #    asi que los que quedan son los de otros metodos: su saldo historico de
    #    transferencia / Mercado Pago va a mostrarse mas alto que antes.
    print('\n' + '-' * 72)
    afectados = Gasto.objects.filter(caja__isnull=False, sale_del_cajon=False)
    if afectados.exists():
        total = sum((g.monto for g in afectados), Decimal('0'))
        print(f'{afectados.count()} gasto(s) por {money(total)} ya no se descuentan del')
        print('desglose de su metodo (antes si). El arqueo del EFECTIVO no cambia.')
        print('Se ven mas altos los saldos historicos de transferencia / Mercado Pago:\n')
        for gasto in afectados[:15]:
            dia = gasto.caja.dia if gasto.caja else '?'
            print(f'   {dia}  {gasto.descripcion[:30]:30} {money(gasto.monto):>14}  {gasto.metodo_pago}')
        if afectados.count() > 15:
            print(f'   ... y {afectados.count() - 15} mas')
    else:
        print('OK: ningun gasto cambia de comportamiento.')

    print('\n' + '=' * 72)
    print('Nada de esto rompe el sistema: son numeros que van a mostrarse distinto.')
    print('=' * 72)


if __name__ == '__main__':
    main()
