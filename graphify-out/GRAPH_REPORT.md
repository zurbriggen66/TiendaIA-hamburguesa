# Graph Report - TiendaIA-hamburguesa  (2026-08-26)

## Corpus Check
- Large corpus: 227 files · ~897,015 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 747 nodes · 1328 edges · 124 communities (55 shown, 69 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.92)
- Token cost: 58,023 input · 0 output

## Community Hubs (Navigation)
- Product & Combo Models
- Expenses, Supplies & Fixed Costs (Gastos)
- Frontend API/Auth & Formatting Utils
- Frontend Package Dependencies
- Customer & Loyalty Points (Clientes)
- Backend Python Dependencies
- Patty/Medallones Utility Logic
- Order & Stats Views (Pedidos/Estadisticas)
- API Permissions & Access Control
- Receipt/Ticket Printing Utils
- Daily Special Admin (Antojo del Dia)
- Frontend App Root & Routing
- Cash Register Detail Modal (Caja)
- Business/Site Configuration (Negocio)
- Fixed Expense Modal (Gasto Fijo)
- Order Card & Locality Modal
- Category Modal & API Client
- Business Home Dashboard (Inicio)
- Order Pricing & Stock Serializers
- Loyalty Points Calculation
- Frontend API Token Handling
- Cash Register Serializer (Caja)
- Collections Page (Cobranzas)
- Payment Methods & Open-Register Modal
- Cash Registers Page (Cajas)
- Order & Detail Models
- Frontend Oxlint Config
- Collections Stats View (Cobranzas)
- Order Detail Serializer
- Combo Modal (Frontend)
- Cash-Register Stats Tests
- Supply/Insumo Modal (Frontend)
- Migration: Create Admin User
- Migration: Caja Dia Backfill
- Migration: Copy Existing Insumos/Productos
- Antojo App Config
- Clientes App Config
- Estadisticas App Config
- Gastos App Config
- Backend manage.py Entrypoint
- Negocio App Config
- Pedidos App Config
- Pedidos Pagination
- Productos App Config
- Migration: antojo 0001 — initial
- Migration: antojo 0002 — remove antojodeldia fecha remove antojodeldia motivo and more
- Migration: antojo 0003 — antojodeldia activo hasta
- Migration: antojo 0004 — antojodeldia presentacion
- Migration: clientes 0001 — initial
- Migration: clientes 0002 — recompensa
- Backend Core Asgi
- Backend Core Settings
- Backend Core Wsgi
- Migration: gastos 0001 — initial
- Migration: gastos 0002 — insumo stock minimo
- Migration: gastos 0003 — gastofijo
- Migration: gastos 0004 — gasto metodo pago
- Migration: gastos 0005 — insumo descuento hasta insumo descuento pct
- Migration: gastos 0006 — insumo precio
- Migration: negocio 0001 — initial
- Migration: negocio 0002 — configuracionsitio instagram and more
- Migration: negocio 0003 — configuracionsitio video principal
- Migration: negocio 0004 — configuracionsitio logo precarga
- Migration: negocio 0005 — configuracionsitio pesos por punto and more
- Migration: negocio 0006 — configuracionsitio color acento and more
- Migration: negocio 0007 — configuracionsitio color boton agregar
- Migration: negocio 0008 — configuracionsitio mensaje cerrado and more
- Migration: pedidos 0001 — initial
- Migration: pedidos 0002 — pedido direccion pedido telefono pedido tipo entrega
- Migration: pedidos 0003 — detallepedido combo alter detallepedido producto
- Migration: pedidos 0004 — localidad pedido costo envio pedido descuento pct and more
- Migration: pedidos 0005 — pedido hora salida
- Migration: pedidos 0006 — detalleextra
- Migration: pedidos 0007 — pedido nota
- Migration: pedidos 0008 — pago
- Migration: pedidos 0009 — detalleextra cantidad
- Migration: pedidos 0010 — detallepedido descuento pct
- Migration: pedidos 0011 — caja pedido caja
- Migration: pedidos 0012 — pedido confirmado pedido origen
- Migration: pedidos 0014 — alter pedido creado
- Migration: pedidos 0015 — alter pedido options
- Migration: pedidos 0016 — detallepedido sugerido carrito
- Migration: pedidos 0017 — caja metodo inicial caja monto inicial
- Migration: pedidos 0018 — pedido cliente registrado pedido descuento puntos and more
- Migration: pedidos 0019 — detallepedido presentacion
- Migration: pedidos 0020 — pedido recompensa pedido recompensa nombre
- Migration: productos 0001 — initial
- Migration: productos 0002 — producto insumos
- Migration: productos 0003 — producto es extra
- Migration: productos 0004 — combo
- Migration: productos 0005 — comboitem productoinsumo
- Migration: productos 0007 — alter combo productos alter producto insumos
- Migration: productos 0008 — producto descuento hasta producto descuento pct
- Migration: productos 0009 — producto descuento carrito pct and more
- Migration: productos 0010 — presentacion
- Migration: productos 0011 — alter presentacion options
- Migration: productos 0012 — presentacioninsumo presentacion insumos extra
- Migration: productos 0013 — producto activo
- Vercel Deployment Config

## God Nodes (most connected - your core abstractions)
1. `react` - 47 edges
2. `api` - 34 edges
3. `EsAdmin` - 20 edges
4. `Producto` - 18 edges
5. `ProductoSerializer` - 17 edges
6. `Pedido` - 16 edges
7. `PedidoSerializer` - 16 edges
8. `Caja` - 14 edges
9. `EsAdminOSoloLectura` - 12 edges
10. `GastoFijo` - 12 edges

## Surprising Connections (you probably didn't know these)
- `TiendaIA-hamburguesa Project` --conceptually_related_to--> `Backend Python Requirements File`  [INFERRED]
  README.md → backend/requirements.txt
- `TiendaIA-hamburguesa Project` --conceptually_related_to--> `Frontend Vite+React Template Readme`  [INFERRED]
  README.md → frontend/README.MD
- `PedidoSerializer` --uses--> `AntojoDelDia`  [INFERRED]
  backend/pedidos/serializers.py → backend/antojo/models.py
- `AntojoDelDiaConfigViewSet` --uses--> `EsAdmin`  [INFERRED]
  backend/antojo/views.py → backend/core/permissions.py
- `ClienteViewSet` --uses--> `EsAdmin`  [INFERRED]
  backend/clientes/views.py → backend/core/permissions.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Django Backend Dependency Stack** — backend_requirements_django, backend_requirements_djangorestframework, backend_requirements_django_cors_headers, backend_requirements_psycopg2_binary, backend_requirements_pillow, backend_requirements_asgiref, backend_requirements_sqlparse, backend_requirements_tzdata, backend_requirements_python_dotenv [INFERRED 0.85]
- **Vite + React Frontend Toolchain** — frontend_readme_vite, frontend_readme_react, frontend_readme_vitejs_plugin_react, frontend_readme_vitejs_plugin_react_swc, frontend_readme_oxlint [INFERRED 0.85]
- **React App HTML Bootstrap Flow** — frontend_index_document, frontend_index_root_div, frontend_index_main_jsx_script [EXTRACTED 1.00]

## Communities (124 total, 69 thin omitted)

### Community 0 - "Product & Combo Models"
Cohesion: 0.06
Nodes (26): EsAdminOSoloLectura, BasePermission, Cualquiera puede leer (GET/HEAD/OPTIONS, para la tienda pública); escribir…, EliminarCajaTests, PresentacionEnPedidoTests, TestCase, CategoriaAdmin, ComboAdmin (+18 more)

### Community 1 - "Expenses, Supplies & Fixed Costs (Gastos)"
Cohesion: 0.09
Nodes (18): GastoAdmin, InsumoAdmin, register, Gasto, GastoFijo, Insumo, Meta, Días hasta el vencimiento. Negativo = ya venció. (+10 more)

### Community 2 - "Frontend API/Auth & Formatting Utils"
Cohesion: 0.10
Nodes (31): guardarToken(), leerToken(), aclararColor(), colorContraste(), useReveal(), AntojoDelDia(), calcularFaltante(), formatearPrecio() (+23 more)

### Community 3 - "Frontend Package Dependencies"
Cohesion: 0.06
Nodes (34): axios, dependencies, axios, qrcode, react, react-dom, react-router-dom, devDependencies (+26 more)

### Community 4 - "Customer & Loyalty Points (Clientes)"
Cohesion: 0.12
Nodes (18): Cliente, Meta, Premio que se canjea por puntos. Es texto libre y no un Producto a propósito:…, Cliente registrado de la tienda. El email, nombre y contraseña viven en el User…, Recompensa, ClienteSerializer, Meta, RecompensaSerializer (+10 more)

### Community 5 - "Backend Python Dependencies"
Cohesion: 0.13
Nodes (24): asgiref 3.12.1, Django 6.0.7, django-cors-headers 4.9.0, Django REST Framework 3.17.1, Backend Python Requirements File, Pillow 12.3.0, psycopg2-binary 2.9.12, python-dotenv 1.2.2 (+16 more)

### Community 6 - "Patty/Medallones Utility Logic"
Cohesion: 0.23
Nodes (19): medallonesDe(), POR_NOMBRE, antojoAplica(), mejorPorcentajeDescuento(), precioBaseConDescuento(), precioBaseSinDescuento(), tieneDescuento(), presentacionesConBase() (+11 more)

### Community 7 - "Order & Stats Views (Pedidos/Estadisticas)"
Cohesion: 0.17
Nodes (11): CajaAdmin, DetallePedidoInline, PedidoAdmin, register, Caja, DetalleExtra, DetallePedido, Localidad (+3 more)

### Community 8 - "API Permissions & Access Control"
Cohesion: 0.16
Nodes (12): es_staff(), EsAdmin, Todo el endpoint requiere estar logueado como staff (panel de administración)., LocalidadSerializer, Meta, PagoSerializer, LocalidadViewSet, PagoViewSet (+4 more)

### Community 9 - "Receipt/Ticket Printing Utils"
Cohesion: 0.27
Nodes (15): CONFIG_DEFAULT, construirBloqueTicket(), construirBloqueTicketCocina(), construirDesgloseTicket(), construirHtmlTicket(), escapeHtml(), formatearPrecio(), guardarConfigImpresion() (+7 more)

### Community 10 - "Daily Special Admin (Antojo del Dia)"
Cohesion: 0.20
Nodes (8): AntojoDelDiaAdmin, register, AntojoDelDia, AntojoDelDiaConfigSerializer, Meta, AntojoDelDiaConfigViewSet, AntojoDelDiaView, APIView

### Community 11 - "Frontend App Root & Routing"
Cohesion: 0.21
Nodes (10): App(), aDatetimeLocal(), AntojoConfigPage(), formatearPrecio(), pad2(), ClientesPage(), formatearFecha(), formatearPrecio() (+2 more)

### Community 12 - "Cash Register Detail Modal (Caja)"
Cohesion: 0.25
Nodes (14): CajaDetalleModal(), formatearDia(), formatearFechaHora(), BarrasDesglose(), formatearFechaCorta(), formatearPrecio(), EstadisticasPage(), formatearDia() (+6 more)

### Community 13 - "Business/Site Configuration (Negocio)"
Cohesion: 0.21
Nodes (7): ConfiguracionSitio, ConfiguracionSitioSerializer, Meta, AdminLoginView, ConfiguracionViewSet, APIView, Login del panel de administración: un único usuario/contraseña compartido (no…

### Community 14 - "Fixed Expense Modal (Gasto Fijo)"
Cohesion: 0.19
Nodes (12): CATEGORIAS, FRECUENCIAS, GastoFijoModal(), hoyISO(), pad2(), CATEGORIAS, GastoModal(), ETIQUETA_CATEGORIA (+4 more)

### Community 15 - "Order Card & Locality Modal"
Cohesion: 0.21
Nodes (14): LocalidadModal(), ETIQUETA_COBRO, ETIQUETA_ESTADO, ETIQUETA_SIGUIENTE, formatearFechaHora(), formatearPrecio(), PedidoCard(), hace7DiasISO() (+6 more)

### Community 16 - "Category Modal & API Client"
Cohesion: 0.26
Nodes (11): api, CategoriaModal(), aDatetimeLocal(), DescuentoProductoModal(), formatearPrecio(), pad2(), nuevaFilaInsumo(), nuevaFilaPresentacion() (+3 more)

### Community 17 - "Business Home Dashboard (Inicio)"
Cohesion: 0.26
Nodes (10): formatearHora(), formatearPrecio(), Inicio(), ORDEN_ESTADOS, formatearPrecio(), PedidoEnvioDescuentoModal(), calcularFalta(), formatearHora() (+2 more)

### Community 18 - "Order Pricing & Stock Serializers"
Cohesion: 0.18
Nodes (3): calcular_precio_producto(), mover_stock_item(), PedidoSerializer

### Community 19 - "Loyalty Points Calculation"
Cohesion: 0.25
Nodes (10): acreditar(), calcular_descuento(), canjear_recompensa(), _config(), pesos_por_punto(), Reglas del programa de puntos, en un solo lugar para que ganar y canjear no se…, Cuántos puntos y cuántos pesos puede canjear este cliente en un pedido de…, Descuenta los puntos del premio si al cliente le alcanzan. El costo sale de la… (+2 more)

### Community 20 - "Frontend API Token Handling"
Cohesion: 0.33
Nodes (8): CLAVE_TOKEN, CLAVE_TOKEN_ADMIN, guardarStorage(), guardarTokenAdmin(), leerStorage(), leerTokenAdmin(), AdminLogin(), RequiereAdmin()

### Community 21 - "Cash Register Serializer (Caja)"
Cohesion: 0.24
Nodes (3): CajaSerializer, CajaViewSet, action

### Community 22 - "Collections Page (Cobranzas)"
Cohesion: 0.36
Nodes (9): CobranzasPage(), ETIQUETA_COBRO, formatearFechaHoraCaja(), formatearPrecio(), hoyISO(), mesActualISO(), pad2(), primerYUltimoDiaDelMes() (+1 more)

### Community 23 - "Payment Methods & Open-Register Modal"
Cohesion: 0.36
Nodes (6): METODOS_PAGO, AbrirCajaModal(), hoyISO(), pad2(), formatearPrecio(), GastoFijoPagarModal()

### Community 24 - "Cash Registers Page (Cajas)"
Cohesion: 0.39
Nodes (7): CajasPage(), formatearDia(), formatearFechaHora(), formatearPrecio(), CerrarCajaModal(), formatearHora(), formatearPrecio()

### Community 26 - "Frontend Oxlint Config"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 27 - "Collections Stats View (Cobranzas)"
Cohesion: 0.38
Nodes (4): CobranzasView, EstadisticasView, HoyView, APIView

### Community 29 - "Combo Modal (Frontend)"
Cohesion: 0.53
Nodes (4): ComboModal(), nuevaFilaProducto(), CombosPage(), formatearPrecio()

### Community 31 - "Supply/Insumo Modal (Frontend)"
Cohesion: 0.60
Nodes (4): aDatetimeLocal(), InsumoModal(), pad2(), UNIDADES

### Community 42 - "Pedidos Pagination"
Cohesion: 0.67
Nodes (3): PedidosPagination, Paginación solo para pedidos: el resto de la API sigue devolviendo listas…, PageNumberPagination

## Knowledge Gaps
- **103 isolated node(s):** `Migration`, `Migration`, `Migration`, `Migration`, `Meta` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend App Root & Routing` to `Frontend API/Auth & Formatting Utils`, `Patty/Medallones Utility Logic`, `Receipt/Ticket Printing Utils`, `Cash Register Detail Modal (Caja)`, `Fixed Expense Modal (Gasto Fijo)`, `Order Card & Locality Modal`, `Category Modal & API Client`, `Business Home Dashboard (Inicio)`, `Frontend API Token Handling`, `Collections Page (Cobranzas)`, `Payment Methods & Open-Register Modal`, `Cash Registers Page (Cajas)`, `Frontend Oxlint Config`, `Combo Modal (Frontend)`, `Supply/Insumo Modal (Frontend)`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `EsAdmin` connect `API Permissions & Access Control` to `Product & Combo Models`, `Expenses, Supplies & Fixed Costs (Gastos)`, `Customer & Loyalty Points (Clientes)`, `Order & Stats Views (Pedidos/Estadisticas)`, `Daily Special Admin (Antojo del Dia)`, `Cash Register Serializer (Caja)`, `Collections Stats View (Cobranzas)`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Producto` connect `Product & Combo Models` to `Daily Special Admin (Antojo del Dia)`, `Order & Stats Views (Pedidos/Estadisticas)`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `EsAdmin` (e.g. with `AntojoDelDiaConfigViewSet` and `ClienteViewSet`) actually correct?**
  _`EsAdmin` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Producto` (e.g. with `ProductoSerializer` and `ProductoViewSet`) actually correct?**
  _`Producto` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `ProductoSerializer` (e.g. with `Presentacion` and `PresentacionInsumo`) actually correct?**
  _`ProductoSerializer` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Migration`, `Migration`, `Migration` to the rest of the system?**
  _103 weakly-connected nodes found - possible documentation gaps or missing edges._