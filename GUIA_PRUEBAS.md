# 🧪 GUÍA DE PRUEBAS - SISTEMA DE NOTIFICACIONES

## Antes de Empezar

- ✅ Servidor Angular corriendo: http://localhost:4300/
- ✅ Cambios compilados correctamente
- ✅ Navegador actualizado (F5 o Ctrl+Shift+R)

---

## 🎬 Escenario 1: Navegar a Página Principal

### Pasos:
1. Abre http://localhost:4300/ en navegador
2. Si NO estás logueado:
   - Verás página de login
   - La sección de notificaciones NO se muestra (correcto)
3. Si YA estás logueado:
   - Verás navbar con todos los elementos

### Qué Verificar:
- [ ] Página carga sin errores
- [ ] Navbar visible (verde oscuro)
- [ ] Icono de campana visible en navbar (si estás logueado)
- [ ] Sin console errors (F12 → Console)

---

## 🔔 Escenario 2: Ver Ícono de Campana

### Pasos:
1. Busca en navbar (derecha) el icono de campana 🔔
2. Debe estar próximo al carrito y menú de usuario

### Qué Verificar:
- [ ] Icono visible
- [ ] Color correcto (blanco/gris claro)
- [ ] Si hay notificaciones sin leer, debe mostrar número rojo
- [ ] Número tiene badge rojo con count

---

## 📂 Escenario 3: Abrir Dropdown de Notificaciones

### Pasos:
1. Clickea el icono de campana (🔔)
2. Se debe abrir un dropdown panel

### Qué Verificar ✅
```
DROPDOWN PANEL:
├─ HEADER:
│  ├─ Título: "Notificaciones"
│  ├─ Botón: "Marcar todas" (si hay sin leer)
│  └─ Subtítulo: "X sin leer" o "Todo al día"
│
├─ BODY (Lista de notificaciones):
│  ├─ Si hay notificaciones:
│  │  ├─ Cada item tiene:
│  │  │  ├─ Icono de color (🟢 Verde, 🔵 Azul, 🟣 Morado, 🔴 Rojo)
│  │  │  ├─ Título en TEXTO OSCURO (legible)
│  │  │  ├─ Mensaje resumido (máx 2 líneas)
│  │  │  ├─ Hora (ej: "Hace 5 min")
│  │  │  └─ Punto azul si no leída
│  │  │
│  │  └─ Al hover en un item:
│  │     ├─ Background se ilumina ligeramente
│  │     └─ Flecha aparece a la derecha
│  │
│  └─ Si no hay notificaciones:
│     ├─ Icono de campana vacía
│     ├─ "No tienes notificaciones"
│     └─ "Te notificaremos sobre tus compras y ventas"
│
└─ FOOTER:
   └─ Botón: "Ver todas las notificaciones →"
```

### Checks Específicos:
- [ ] **FONDO ES BLANCO** (no gris, no negro)
- [ ] **TEXTO ES OSCURO** (legible contra fondo blanco)
- [ ] Iconos tienen colores brillantes (no apagados)
- [ ] Sombra debajo del dropdown (efecto de elevación)
- [ ] Panel tiene bordes redondeados (border-radius)
- [ ] Scroll funciona si hay muchas notificaciones
- [ ] Custom scrollbar visible (si hay scroll)

---

## 🎯 Escenario 4: Hacer Click en Una Notificación

### Pasos:
1. Con dropdown abierto, clickea en una notificación
2. Se debe abrir un MODAL

### Qué Verificar ✅
```
MODAL:
├─ BACKDROP (detrás del modal):
│  ├─ Color oscuro (negro semi-transparente)
│  └─ Si clickeas afuera → Modal se cierra
│
├─ HEADER (color según tipo):
│  ├─ Si tipo = "compra_exitosa": Verde
│  ├─ Si tipo = "nueva_venta": Azul
│  ├─ Si tipo = "proyecto_subido": Morado
│  ├─ Si tipo = "compra_error": Rojo
│  ├─ Color es degradado (gradient)
│  ├─ Icono en círculo blanco
│  ├─ Título de la notificación
│  ├─ Subtítulo descriptivo
│  └─ Botón X para cerrar (esquina superior derecha)
│
├─ BODY:
│  ├─ Fondo blanco
│  ├─ Mensaje completo de la notificación
│  ├─ Si hay datos extra:
│  │  ├─ Sección "Detalles adicionales" en fondo gris
│  │  ├─ Proyecto (si aplica)
│  │  ├─ Monto (formateado en currency)
│  │  ├─ Método de pago
│  │  ├─ Comprador/Vendedor
│  │  └─ Cada detalle en línea separada
│  ├─ Timestamp (fecha y hora)
│  ├─ Indicador de lectura ("Leída" o "No leída")
│  └─ Custom scrollbar si hay mucho contenido
│
└─ FOOTER:
   ├─ Si NO está leída:
   │  ├─ Botón primario: "Marcar como leída"
   │  └─ Botón secundario: "Cerrar"
   └─ Si YA está leída:
      └─ Solo botón: "Cerrar"
```

### Checks Específicos:
- [ ] Modal aparece **CENTRADO en pantalla**
  - [ ] No está arriba
  - [ ] No está abajo
  - [ ] No está a la izquierda
  - [ ] No está a la derecha
- [ ] Header tiene color correcto (según tipo)
- [ ] Body contiene toda la información
- [ ] Footer tiene botones funcionales
- [ ] Animación es suave (no aparece de golpe)
- [ ] **El dropdown SIGUE VISIBLE detrás del modal**
- [ ] Tamaño del modal es apropiado (no muy pequeño, no muy grande)

---

## 🔄 Escenario 5: Interactuar con Modal

### Paso A: Marcar como Leída
1. Si notificación NO está leída:
   - Clickea botón "Marcar como leída"
   - Botón debe mostrar spinner/loading
   - Punto azul del item debe desaparecer
   - Contador de sin leer debe decrementar
   - Botón debe desaparecer del modal

### Paso B: Cerrar Modal
1. Clickea botón "Cerrar" en footer
   - O clickea X en header
   - O clickea fuera del modal (en backdrop)

2. Modal debe cerrarse suavemente

### Qué Verificar:
- [ ] Botones responden al click
- [ ] Animación de cierre es suave
- [ ] Dropdown sigue abierto después de cerrar modal
- [ ] Sin errores en console

---

## 📋 Escenario 6: Múltiples Notificaciones

### Pasos:
1. Con dropdown abierto
2. Clickea en una notificación → Abre modal
3. Cierra modal (X, botón, o fuera)
4. Dropdown debe seguir abierto
5. Clickea en OTRA notificación
6. Debe abrir el SEGUNDO modal sin cerrar dropdown

### Qué Verificar:
- [ ] Puedes abrir/cerrar múltiples modales sin cerrar dropdown
- [ ] Cada modal muestra contenido diferente
- [ ] Z-index se mantiene (modal encima de dropdown)
- [ ] Sin lag o delays

---

## ❌ Escenario 7: Cerrar Dropdown

### Pasos:
1. Con dropdown abierto (sin modal abierto)
2. Clickea el icono de campana nuevamente
3. El dropdown debe cerrar

### Alternativas para Cerrar:
- [ ] Clickear X no visible (solo con click en campana)
- [ ] Clickear FUERA del dropdown (en página)
- [ ] Presionar Escape (si está implementado)

### Qué Verificar:
- [ ] Dropdown se cierra suavemente
- [ ] Animación inversa (no de golpe)
- [ ] Página vuelve a normal

---

## 📱 Escenario 8: Responsive Mobile

### Pasos:
1. Abre DevTools (F12)
2. Click en ícono de "Toggle device toolbar" (Ctrl+Shift+M)
3. Selecciona tamaño: **iPhone 12** (390x844)
4. Repite escenarios 2-6

### Qué Verificar:
- [ ] Navbar sigue visible
- [ ] Icono de campana accesible
- [ ] Dropdown es ancho suficiente pero no abruma pantalla
- [ ] Modal se adapta al tamaño pequeño
- [ ] Footer (botones) es accesible
- [ ] Scroll funciona si hay mucho contenido
- [ ] Sin elementos que se corten

---

## 🎨 Escenario 9: Verificar Colores

### Para Cada Tipo de Notificación:

**Compra Exitosa (🟢 Verde)**
- [ ] Icono en dropdown: Checkmark en círculo VERDE
- [ ] Header en modal: Fondo VERDE
- [ ] Colores consistentes

**Nueva Venta (🔵 Azul)**
- [ ] Icono en dropdown: Moneda en círculo AZUL
- [ ] Header en modal: Fondo AZUL
- [ ] Colores consistentes

**Proyecto Subido (🟣 Morado)**
- [ ] Icono en dropdown: Carpetas en círculo MORADO
- [ ] Header en modal: Fondo MORADO
- [ ] Colores consistentes

**Compra Error (🔴 Rojo)**
- [ ] Icono en dropdown: Exclamación en círculo ROJO
- [ ] Header en modal: Fondo ROJO
- [ ] Colores consistentes

---

## 🏃 Escenario 10: Acciones Rápidas

### Marcar Todas como Leídas:
1. Abre dropdown
2. Si hay notificaciones sin leer
3. Clickea botón "Marcar todas"
4. Todos los puntos azules deben desaparecer
5. Badge rojo debe desaparecer
6. Mensaje cambia a "Todo al día"

### Ver Todas las Notificaciones:
1. Abre dropdown
2. Clickea "Ver todas las notificaciones" en footer
3. Navega a página de notificaciones completa
4. Dropdown se cierra automáticamente

---

## 🚨 Escenario 11: Casos de Error

### Si Dropdown Aparece OSCURO:
```
❌ PROBLEMA: Fondo no es blanco
🔍 INVESTIGAR:
   1. F12 → Inspector
   2. Click en div del dropdown
   3. Ver clases CSS
   4. Buscar "bg-white"
   5. Si no está, reportar
```

### Si Modal NO está Centrado:
```
❌ PROBLEMA: Modal aparece arriba/abajo
🔍 INVESTIGAR:
   1. F12 → Inspector
   2. Click en modal
   3. Ver qué clases tiene
   4. Buscar: flex, items-center, justify-center
   5. Si falta, reportar
```

### Si Modal aparece Detrás de Dropdown:
```
❌ PROBLEMA: Z-index incorrecto
🔍 INVESTIGAR:
   1. F12 → Inspector
   2. Click en modal
   3. Ver z-index en styles
   4. Debe ser mayor que dropdown (z-50)
   5. Si no, reportar
```

### Si Animación no es Suave:
```
❌ PROBLEMA: Modal aparece de golpe
🔍 INVESTIGAR:
   1. F12 → Sources
   2. Buscar notification-modal.component.scss
   3. Verificar @keyframes fadeIn y slideIn
   4. Si no están, reportar
```

---

## 📸 Screenshots a Capturar

Toma screenshots de:

1. **Dropdown Normal**
   - Abierto mostrando 3-5 notificaciones
   - Fondo blanco, texto oscuro, iconos colores

2. **Modal Abierto**
   - Centrado en pantalla
   - Header con color según tipo
   - Body con contenido visible
   - Footer con botones

3. **Dropdown + Modal Juntos**
   - Para verificar que modal NO interfiere con dropdown

4. **Mobile View**
   - Dropdown en iPhone 12
   - Modal en iPhone 12

---

## ✅ Confirmación Final

Si TODO funciona como se describe:

```
🟢 VERDE - Sistema completamente funcional
   ├─ Dropdown: Blanco con texto oscuro ✅
   ├─ Modal: Centrado y visible ✅
   ├─ Animaciones: Suaves ✅
   ├─ Z-index: Correcto ✅
   ├─ Responsive: Funciona ✅
   └─ Sin errores: Console limpia ✅
```

---

## 🔧 Si Algo No Funciona

Por favor proporciona:

1. **Descripción clara** de qué viste (vs qué esperabas)
2. **Screenshot** de lo que ves
3. **Console log** (F12 → Console → copiar errores)
4. **Elemento inspeccionado** (F12 → Inspector → copiar HTML + styles)
5. **Tamaño de pantalla** (Desktop/Mobile/Tablet)

Con esta información puedo hacer fixes más precisos.

---

## 📌 Notas Importantes

- Los cambios son **solo CSS**, la lógica TypeScript NO cambió
- Angular recompiló automáticamente
- Los cambios se aplican al refrescar el navegador
- Si ves algo raro, probablemente hay cache
- Usa **Ctrl+Shift+R** para limpiar cache local

---

**¡Listo para probar! Abre http://localhost:4300/ y verifica cada escenario.**
