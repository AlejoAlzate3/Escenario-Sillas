
const confirmButton = document.getElementById("confirmButton");
confirmButton.addEventListener("click", confirmarSeleccion);

const map = new ol.Map({
    target: "map",
    layers: [],
    view: new ol.View({
        center: ol.proj.fromLonLat([-0.99, 1.065]),
        zoom: 8,
        minZoom: 12.1,
        maxZoom: 15,
    }),
});

// Agregar el mapa base
const sillasSource = new ol.source.Vector();
const selectedFeatures = new ol.Collection();

// Crear bloques de sillas
const blocks = [
    //Columna central
    {name: "Platino A",precio: 150_000,minX: -0.96,minY: 1.05,maxX: -1.001,maxY: 1.001,numRows: 10,numCols: 10},
    //Columna 1 izquierda
    {name: "Platino B",precio: 110_000,minX: -1.054,minY: 1.05,maxX: -1.01,maxY: 1.001,numRows: 10,numCols: 10},
    //Columna 2 izquierda
    {name: "Oro A",precio: 250_000,minX: -1.065,minY: 1.045,maxX: -1.11,maxY: 1.085,numRows: 10,numCols: 10},
    //Columna 1 derecha
    {name: "Platino C",precio: 110_000,minX: -0.945,minY: 1.05,maxX: -0.9,maxY: 1.001,numRows: 10,numCols: 10},
    //Columna 2 derecha
    {name: "Oro B",precio: 250_000,minX: -0.895,minY: 1.09,maxX: -0.85,maxY: 1.05,numRows: 10,numCols: 10},
];

// Crear sillas
blocks.forEach((block) => {
    const { minX, minY, maxX, maxY, numRows, numCols } = block;
    const rowSpacing = (maxY - minY) / numRows;
    const colSpacing = (maxX - minX) / numCols;

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            const x = minX + col * colSpacing;
            const y = maxY - row * rowSpacing;

            const sillaFeature = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([x, y])),
                numero: `Fila ${row + 1}, Asiento ${col + 1}, Zona ${block.name}`,
                disponible: true,
                comprada: false,
                zona: block.name,
            });

            sillasSource.addFeature(sillaFeature);
        }
    }
});

const escenarioImageUrl = "img/escenario.png";

const escenarioLayer = new ol.layer.Image({
    source: new ol.source.ImageStatic({
        url: escenarioImageUrl,
        imageExtent: [-0.915, 1.13, -1.045, 1.058],
        projection: 'EPSG:4326',
    }),
});

// Crear capa de sillas
const sillasLayer = new ol.layer.Vector({
    source: sillasSource,
    style: function (feature) {
        const style = new ol.style.Style({
            image: new ol.style.Icon({
                src: "img/avaible.png",
                scale: 0.08,
            }),
        });

        if (!feature.get("disponible")) {
            style.getImage().setSrc({
                src: "img/purchased.png",
                scale: 0.08,
                cursor: "not-allowed",
            });
        }
        return style;
    },
});

//Color - Selección & Deselección Silla
const selectedStyle = new ol.style.Style({
    image: new ol.style.Icon({
        src: "img/select.png",
        scale: 0.09,
    }),
});

const defaultStyle = new ol.style.Style({
    image: new ol.style.Icon({
        src: "img/avaible.png",
        scale: 0.08,
    }),
});

const compradaStyle = new ol.style.Style({
    image: new ol.style.Icon({
        src: "img/purchased.png",
        scale: 0.08,
    }),
});

// Agrega estilos a las sillas según su disponibilidad
sillasLayer.setStyle(function (feature) {
    const disponible = feature.get("disponible");
    const comprada = feature.get("comprada");
    const selected = selectedFeatures.getArray().includes(feature);

    if (comprada) {
        return compradaStyle;
    } else if (selected) {
        return selectedStyle;
    } else if (disponible) {
        return defaultStyle;
    } else {
        return null;
    }
});

// Agregar interacción de selección
const selectInteraction = new ol.interaction.Select({
    layers: [sillasLayer],
    condition: ol.events.condition.click,
    multi: true,
    toggleCondition : ol.events.condition.click,
});
map.addInteraction(selectInteraction);


const selectedSeats = new Set();
selectInteraction.on("select", function (event) {
    event.selected.forEach(function (feature) {
        if (!feature.get("comprada")) {
            const numeroSilla = feature.get("numero");

            if (!selectedFeatures.getArray().includes(feature)) {
                selectedFeatures.push(feature);
                feature.setStyle(selectedStyle);
                console.log(`Silla ${numeroSilla} seleccionada.`);
            } else {
                selectedFeatures.remove(feature);
                feature.setStyle(defaultStyle);
                console.log(`Silla ${numeroSilla} deseleccionada.`);
            }
        }
    });

    const selectedSeatsList = document.getElementById("selected-seats-list");
    selectedSeatsList.innerHTML = "";

    selectedFeatures.forEach(function (feature) {
        const numeroSilla = feature.get("numero");
        const comprada = feature.get("comprada");
        const zonaSilla = feature.get("zona");
        const precioZona = blocks.find((block) => block.name === zonaSilla)?.precio || 0;

        if (!comprada) {
            const listItem = document.createElement("li");
            listItem.textContent = `Silla seleccionada: ${numeroSilla}, Precio: ${precioZona}`;
            selectedSeatsList.appendChild(listItem);
        }

        selectedSeats.add(numeroSilla);
    });
});
map.addLayer(sillasLayer);
map.addLayer(escenarioLayer);

function confirmarSeleccion() {
    comprarSillasSeleccionadasCalendar();
}




//Calendario
let selectedDate = null;
let eventsForSelectedDate = [];

// Inicializa Flatpickr
const datepicker = flatpickr("#datepicker", {
    dateFormat: "Y-m-d",
    onChange: function (selectedDates, dateStr, instance) {
        selectedDate = dateStr;
        eventsForSelectedDate = getEventsForDate(dateStr);
        renderCalendar();

        if (eventsForSelectedDate.length === 0) {
            disableSeatSelection();
        } else {
            enableSeatSelection();
        }
    },
});

// Filtra las sillas para la fecha y evento específicos
function getSillasForDateAndEvento(dateStr, eventoCodigo) {
    return sillasSource.getFeatures().filter((feature) => {
        return feature.get("eventoFecha") === dateStr && feature.get("eventoCodigo") === eventoCodigo;
    });
}

const sillasSeleccionadasPorEvento = {};

function enableSeatSelection() {
    selectInteraction.setActive(true);

    // Obtiene el evento seleccionado para la fecha actual
    const selectedEvent = eventsForSelectedDate.length > 0 ? eventsForSelectedDate[0] : null;
    console.log("Evento seleccionado:", selectedEvent);

    const aforoMaximo = selectedEvent ? selectedEvent.aforo : 0;
    console.log("Aforo máximo:", aforoMaximo);

    const claveEvento = selectedEvent ? selectedEvent.codigo : null;

    if (claveEvento) {
        // Obtiene las sillas correspondientes al evento y fecha seleccionados
        const sillasParaMostrar = getSillasForDateAndEvento(selectedDate, claveEvento);

        // Calcula las sillas disponibles restando las compradas del aforo máximo
        const sillasDisponibles = aforoMaximo - sillasParaMostrar.filter(feature => feature.get("comprada")).length;
        console.log("Sillas disponibles:", sillasDisponibles);

        // Actualiza la disponibilidad de sillas según el aforo máximo
        sillasSource.getFeatures().forEach((feature) => {
            const comprada = feature.get("comprada");
            const numeroSilla = feature.get("numero");

            if (comprada || numeroSilla > aforoMaximo || !sillasParaMostrar.includes(feature)) {
                feature.set("disponible", false);
                feature.setStyle(comprada ? compradaStyle : defaultStyle);
            } else {
                feature.set("disponible", true);
                feature.setStyle(defaultStyle);
            }
        });
    }
}

// Deshabilita la selección de sillas
function disableSeatSelection() {
    selectInteraction.setActive(false);

    sillasSource.getFeatures().forEach((feature) => {
        if (feature.get("disponible") && !feature.get("comprada")) {
            feature.setStyle(defaultStyle);
        }
    });
}

function getEventsForDate(dateStr) {
    const events = [
        {
            codigo: 20230901,
            title: 'Concierto de rock',
            start: '2023-09-01',
            description: 'AC/DC - 8:00 PM',
            aforo: 500,
        },
        {
            codigo: 20230905,
            title: 'Concierto de rock',
            start: '2023-09-05',
            description: 'Metallica - 8:00 PM',
            aforo: 250,
        },
        {
            codigo: 20230910,
            title: 'Concierto de Reggaeton',
            start: '2023-09-02',
            description: 'Arcangel - 8:00 PM',
            aforo: 250,
        },
    ];

    // Filtra los eventos para la fecha seleccionada
    return events.filter(event => event.start === dateStr);
}

let sillasAComprar = {};

function renderCalendar() {
    const eventsList = document.getElementById('events-list');
    eventsList.innerHTML = '';

    sillasSource.getFeatures().forEach((feature) => {
        const eventoFecha = feature.get("eventoFecha");
        const comprada = feature.get("comprada");

        const claveEvento = `${selectedDate}_${eventsForSelectedDate.title}`;

        if (eventoFecha === selectedDate && comprada && sillasAComprar[claveEvento]?.includes(feature)) {
            feature.set("disponible", !comprada);
            feature.set("seleccionable", true);
            feature.setStyle(comprada ? compradaStyle : defaultStyle);
        } else {
            feature.set("disponible", false);
            feature.set("seleccionable", false);
            feature.setStyle(compradaStyle);
        }
    });

    if (eventsForSelectedDate.length === 0) {
        const noEventsItem = document.createElement('p');
        noEventsItem.textContent = 'No hay eventos para esta fecha.';
        eventsList.appendChild(noEventsItem);

        sillasSource.getFeatures().forEach((feature) => {
            feature.set("disponible", true);
            feature.set("seleccionable", false);
            feature.setStyle(defaultStyle);
        });
    } else {
        // Suponiendo que solo haya un evento para la fecha seleccionada
        const eventoSeleccionado = eventsForSelectedDate[0];
        const fechaEvento = selectedDate;
        const claveEvento = `${fechaEvento}_${eventoSeleccionado.title}`;

        const sillasCompradasParaEvento = sillasAComprar[claveEvento] || [];

        eventsForSelectedDate.forEach(event => {
            const eventItem = document.createElement('li');
            eventItem.classList.add('event-item');
            eventItem.innerHTML = `
                <h3>${event.title}</h3>
                <p>${event.description}</p>
                <p>Fecha: ${event.start}</p>
            `;
            eventsList.appendChild(eventItem);
        });

        sillasSource.getFeatures().forEach((feature) => {
            const numeroSilla = feature.get("numero");
            if (sillasCompradasParaEvento.includes(numeroSilla)) {
                feature.set("disponible", false);
                feature.setStyle(compradaStyle);
            } else {
                feature.set("disponible", true);
                feature.setStyle(defaultStyle);
            }
        });
    }
}

const sillasCompradasPorEvento = {};

function comprarSillasSeleccionadasCalendar() {
    const sillasParaComprar = selectedFeatures.getArray();
    let totalPrecio = 0;
    const zonaPrecios = [];

    // Actualiza la lista de sillas compradas
    const selectedSeatsList = document.getElementById("selected-seats-list");
    selectedSeatsList.innerHTML = "";

    console.log("Fecha seleccionada:", selectedDate);
    console.log("Eventos para la fecha seleccionada:", eventsForSelectedDate);

    if (!selectedDate || !eventsForSelectedDate) {
        alert("Por favor, selecciona una fecha y un evento primero.");
        return;
    }

    if (sillasParaComprar.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = `No se han seleccionado sillas para comprar.`;
        selectedSeatsList.appendChild(listItem);
        return;
    }

    const eventoSeleccionado = eventsForSelectedDate[0];
    if (eventoSeleccionado) {
        const claveEvento = eventoSeleccionado.codigo;

        // Obtén la lista de sillas compradas para este evento
        const sillasCompradasParaEvento = sillasCompradasPorEvento[claveEvento] || [];

        sillasParaComprar.forEach((feature) => {
            const numeroSilla = feature.get("numero");

            if (!feature.get("comprada")) {
                if (sillasCompradasParaEvento.includes(numeroSilla)) {
                    // Si la silla estaba previamente comprada, entonces la desmarcamos
                    const index = sillasCompradasParaEvento.indexOf(numeroSilla);
                    if (index !== -1) {
                        sillasCompradasParaEvento.splice(index, 1);
                    }
                    feature.setStyle(defaultStyle);
                } else {
                    // La silla no estaba comprada, la marcamos como comprada
                    sillasCompradasParaEvento.push(numeroSilla);
                    feature.set("comprada", true);
                    feature.setStyle(compradaStyle);
                }
            }
        });

        // Actualiza la lista de sillas compradas para este evento
        sillasCompradasPorEvento[claveEvento] = sillasCompradasParaEvento;
    }

    sillasParaComprar.forEach((feature) => {
        const numeroSilla = feature.get("numero");
        const zonaSilla = feature.get("zona");
        const precioZona = blocks.find((block) => block.name === zonaSilla)?.precio || 0;

        feature.set("disponible", false);
        console.log("Silla comprada:", numeroSilla, ", Zona:", zonaSilla);
        console.log("Sillas compradas por evento:", sillasCompradasPorEvento);

        // Agregar el precio de la zona al objeto de precios
        if (!zonaPrecios[zonaSilla]) {
            zonaPrecios[zonaSilla] = 0;
        }
        zonaPrecios[zonaSilla] += precioZona;

        const listItem = document.createElement("li");
        listItem.textContent = `Silla comprada: ${numeroSilla}, Precio: ${precioZona}`;
        selectedSeatsList.appendChild(listItem);
    });

    // Calcular el precio total
    for (const zona in zonaPrecios) {
        totalPrecio += zonaPrecios[zona];
    }

    // Mostrar el precio total
    const listItem = document.createElement("li");
    listItem.textContent = `Precio total del boleto: ${totalPrecio}`;
    selectedSeatsList.appendChild(listItem);
    console.log("Precio total:", totalPrecio);

    // Limpia la lista de sillas seleccionadas
    selectedFeatures.clear();
}