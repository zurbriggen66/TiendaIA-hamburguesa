"""Reglas del programa de puntos, en un solo lugar para que ganar y canjear no se
desincronicen. Todo se calcula en el servidor: el frontend solo pide "usar puntos"."""

from decimal import Decimal


def _config():
    from negocio.models import ConfiguracionSitio

    return ConfiguracionSitio.objects.last()


def valor_punto():
    config = _config()
    return Decimal(config.valor_punto) if config else Decimal('1')


def pesos_por_punto():
    config = _config()
    return max(int(config.pesos_por_punto), 1) if config else 100


def calcular_descuento(cliente, total):
    """Cuántos puntos y cuántos pesos puede canjear este cliente en un pedido de `total`.

    Se topea contra los puntos que el cliente REALMENTE tiene y contra el total, así
    nadie descuenta más de lo que tiene ni deja el pedido en negativo."""
    if not cliente or cliente.puntos <= 0 or total <= 0:
        return 0, Decimal('0')

    valor = valor_punto()
    if valor <= 0:
        return 0, Decimal('0')

    puntos_que_entran = min(cliente.puntos, int(total / valor))
    return puntos_que_entran, (Decimal(puntos_que_entran) * valor)


def canjear_recompensa(cliente, recompensa):
    """Descuenta los puntos del premio si al cliente le alcanzan.

    El costo sale de la base, nunca del pedido que llega del frontend."""
    if not cliente or not recompensa or not recompensa.activa:
        return False
    if cliente.puntos < recompensa.puntos:
        return False

    cliente.puntos -= recompensa.puntos
    cliente.save(update_fields=['puntos'])
    return True


def acreditar(pedido):
    """Suma los puntos ganados por un pedido. Idempotente: si ya se acreditaron, no repite."""
    cliente = pedido.cliente_registrado
    if not cliente or pedido.puntos_acreditados:
        return 0

    ganados = int(pedido.calcular_total() / pesos_por_punto())
    if ganados > 0:
        cliente.puntos += ganados
        cliente.save(update_fields=['puntos'])
    pedido.puntos_acreditados = True
    pedido.save(update_fields=['puntos_acreditados'])
    return ganados
