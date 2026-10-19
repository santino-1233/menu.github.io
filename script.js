// Pegá acá el enlace CSV publicado desde Google Sheets
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsdP4L0QCKGekMlPLynqRv8RJr7KZJZVGf0cmyGDWhOwHmRPri2_yXcpigYOm3JRYvkpKlXPrBNm2e/pub?output=csv";

// Parser de CSV que respeta campos entre comillas
function parsearCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const siguiente = texto[i + 1];

    if (entreComillas) {
      if (c === '"' && siguiente === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && siguiente === "\n") i++;
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas;
}

// Convierte las filas en objetos usando la primera fila como encabezado
function filasAObjetos(filas) {
  const [encabezados, ...datos] = filas;
  return datos
    .filter((f) => f.some((celda) => celda.trim() !== ""))
    .map((f) => {
      const obj = {};
      encabezados.forEach((h, i) => {
        obj[h.trim()] = (f[i] || "").trim();
      });
      return obj;
    });
}

function formatearPrecio(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor;
  return "$" + numero.toLocaleString("es-AR");
}

function crearItem(plato) {
  const disponible = plato.disponible.toUpperCase() !== "NO";

  const item = document.createElement("div");
  item.className = "item" + (disponible ? "" : " agotado");

  const info = document.createElement("div");
  info.className = "item-info";

  const nombre = document.createElement("div");
  nombre.className = "item-nombre";
  nombre.textContent = plato.plato;

  if (!disponible) {
    const badge = document.createElement("span");
    badge.className = "badge-agotado";
    badge.textContent = "Agotado";
    nombre.appendChild(badge);
  }

  info.appendChild(nombre);

  if (plato.descripcion) {
    const desc = document.createElement("div");
    desc.className = "item-descripcion";
    desc.textContent = plato.descripcion;
    info.appendChild(desc);
  }

  const precio = document.createElement("div");
  precio.className = "item-precio";
  precio.textContent = formatearPrecio(plato.precio);

  item.appendChild(info);
  item.appendChild(precio);
  return item;
}

function agruparPorCategoria(platos) {
  const grupos = new Map();
  platos.forEach((p) => {
    if (!grupos.has(p.categoria)) {
      grupos.set(p.categoria, new Map());
    }
    const subs = grupos.get(p.categoria);
    const sub = p.subcategoria || "";
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub).push(p);
  });
  return grupos;
}

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function renderizar(platos) {
  const contenedor = document.getElementById("menu");
  const nav = document.getElementById("navegacion");
  contenedor.innerHTML = "";
  nav.innerHTML = "";

  const grupos = agruparPorCategoria(platos);

  grupos.forEach((subcategorias, categoria) => {
    const id = slug(categoria);

    const link = document.createElement("a");
    link.href = "#" + id;
    link.textContent = categoria;
    nav.appendChild(link);

    const seccion = document.createElement("section");
    seccion.className = "categoria";
    seccion.id = id;

    const titulo = document.createElement("h2");
    titulo.textContent = categoria;
    seccion.appendChild(titulo);

    subcategorias.forEach((items, subcategoria) => {
      if (subcategoria) {
        const sub = document.createElement("h3");
        sub.className = "subcategoria";
        sub.textContent = subcategoria;
        seccion.appendChild(sub);
      }
      items.forEach((plato) => seccion.appendChild(crearItem(plato)));
    });

    contenedor.appendChild(seccion);
  });
}

async function cargarMenu() {
  const estado = document.getElementById("estado");

  try {
    // Agrego un parámetro para evitar que el navegador use una copia vieja
    const respuesta = await fetch(URL_CSV + "&t=" + Date.now());
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

    const texto = await respuesta.text();
    const platos = filasAObjetos(parsearCSV(texto));

    if (platos.length === 0) {
      estado.textContent = "No hay platos cargados todavía.";
      return;
    }

    renderizar(platos);
    estado.textContent = "";
  } catch (error) {
    console.error(error);
    estado.textContent = "No se pudo cargar el menú. Intentá de nuevo en unos minutos.";
    estado.classList.add("error");
  }
}

cargarMenu();
