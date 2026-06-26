/*
  ══════════════════════════════════════════════════════════════
  app.js  —  My Maps App
  ══════════════════════════════════════════════════════════════

  HOW THIS FILE IS ORGANISED
  ──────────────────────────
   1.  Create the map & tile layers
   2.  Add landmark markers
   3.  Map click → show info card
   4.  Search (Nominatim API)
   5.  GPS "My Location"
   6.  Directions (Routing Machine)
   7.  Sidebar open / close
   8.  Dark mode toggle
   9.  Saved places
  10.  Nearby search
  11.  Bottom tabs
  12.  Fullscreen
  13.  Scale bar
  14.  Toast notification helper
  15.  Keyboard shortcuts
  16.  Responsive sidebar behaviour
  ══════════════════════════════════════════════════════════════
*/

/* ════════════════════════════════════════════════════════════
   1. CREATE THE MAP & TILE LAYERS
   ════════════════════════════════════════════════════════════ */

/*
  L.map('map') tells Leaflet to create a map inside the <div id="map">.
  center: [latitude, longitude]  — Algiers city centre
  zoom: 13  — city-level zoom (1 = whole world, 19 = street level)
  zoomControl: false  — we have our own zoom buttons in the HTML
*/
const map = L.map("map", {
  center: [36.737, 3.0865],
  zoom: 13,
  zoomControl: false,
  attributionControl: true,
});

/*
  "Tile layers" are the map image itself, cut into small squares (tiles).
  Each URL pattern ({z}/{x}/{y}) is a grid reference Leaflet fills in.
  We create three different visual styles so the user can switch between them.
*/
const tileLayers = {
  Default: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }),

  Satellite: L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: '© <a href="https://www.esri.com/">Esri</a>',
      maxZoom: 19,
    },
  ),

  Terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://opentopomap.org/">OpenTopoMap</a>',
    maxZoom: 17,
  }),

  Dark: L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    {
      attribution: '© <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
  ),
};

/* Start with the Default layer added to the map */
tileLayers.Default.addTo(map);
let currentLayer = "Default";

/*
  switchLayer() cycles through the styles one by one.
  It removes the current layer and adds the next one.
*/
function switchLayer() {
  const names = Object.keys(tileLayers); // ['Default','Satellite','Terrain','Dark']
  const nextIndex = (names.indexOf(currentLayer) + 1) % names.length;
  const nextName = names[nextIndex];

  map.removeLayer(tileLayers[currentLayer]); // remove old layer
  tileLayers[nextName].addTo(map); // add new layer

  currentLayer = nextName;
  document.getElementById("layer-label").textContent = nextName;
  document.getElementById("current-layer-name").textContent =
    "Currently: " + nextName;

  showToast("Map style: " + nextName);
}

/* ════════════════════════════════════════════════════════════
   2. ADD LANDMARK MARKERS
   ════════════════════════════════════════════════════════════ */

/*
  Each object describes one famous place.
  lat/lng = GPS coordinates (you can find these on Google Maps by right-clicking)
  type    = category, used to colour the marker
*/
const landmarks = [];

/*
  Marker icon colours per category.
  We pick from Font Awesome + a simple SVG so each type looks different.
*/
const iconColors = {
  university: "#1a73e8" /* blue */,
  mosque: "#34a853" /* green */,
  monument: "#ea4335" /* red */,
  airport: "#5f6368" /* grey */,
  heritage: "#ff6d00" /* orange */,
  park: "#34a853" /* green */,
  beach: "#0097a7" /* teal */,
};

/*
  createIcon() builds a custom round Leaflet marker icon with a given colour.
  DivIcon lets us use regular HTML+CSS instead of an image file.
*/
function createIcon(color) {
  return L.divIcon({
    className: "" /* remove default white square */,
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32] /* tip of the marker is at the bottom centre */,
    popupAnchor: [0, -36],
  });
}

/* Add each landmark to the map */
landmarks.forEach(function (place) {
  const color = iconColors[place.type] || "#1a73e8";
  const marker = L.marker([place.lat, place.lng], { icon: createIcon(color) });

  /* Popup shown when user clicks the marker */
  marker.bindPopup(`
    <strong style="font-size:14px;">${place.name}</strong><br>
    <span style="color:#5f6368; font-size:12px;">${place.desc}</span>
  `);

  /* Also show the info card at the bottom */
  marker.on("click", function () {
    showInfoCard(place.name, place.lat.toFixed(5), place.lng.toFixed(5));
  });

  marker.addTo(map);
});

/* ════════════════════════════════════════════════════════════
   3. MAP CLICK → SHOW INFO CARD
   ════════════════════════════════════════════════════════════ */

/*
  Store the last-clicked coordinates so other functions
  (like Save and Share) know what place is selected.
*/
let clickedLat = 36.737;
let clickedLng = 3.0865;

/* When user clicks anywhere on the map (not on a marker) */
map.on("click", function (event) {
  clickedLat = event.latlng.lat;
  clickedLng = event.latlng.lng;
  showInfoCard("Custom Location", clickedLat.toFixed(5), clickedLng.toFixed(5));
});

/* Build and display the info card at the bottom */
function showInfoCard(name, lat, lng) {
  document.getElementById("info-title").textContent = name;
  document.getElementById("info-sub").textContent = lat + ", " + lng;
  document.getElementById("info-card").classList.add("open");
}

function closeInfoCard() {
  document.getElementById("info-card").classList.remove("open");
}

/* Allow clicking outside the info card to close it */
map.on("click", function () {
  /* Small delay so the card doesn't close immediately when you click the map */
  setTimeout(closeInfoCard, 150);
});

/* ════════════════════════════════════════════════════════════
   4. SEARCH  (Nominatim geocoding API — free, no key needed)
   ════════════════════════════════════════════════════════════ */

const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const clearBtn = document.getElementById("clear-btn");

/* Show/hide the clear (×) button as the user types */
searchInput.addEventListener("input", function () {
  clearBtn.style.display = searchInput.value.length > 0 ? "flex" : "none";
});

/* Clicking × clears the input and hides results */
clearBtn.onclick = function () {
  searchInput.value = "";
  clearBtn.style.display = "none";
  searchResults.style.display = "none";
  searchInput.focus();
};

/* Submit search on Enter key or arrow button click */
searchInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") doSearch();
});
document.getElementById("search-btn").onclick = doSearch;

/*
  doSearch() calls the Nominatim API.
  "fetch(url)" sends a web request and returns a Promise.
  ".then()" runs when the request is done.
*/
function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  /* Show a "Searching…" state */
  searchResults.innerHTML =
    '<div class="result-item"><i class="fa-solid fa-spinner fa-spin"></i> Searching…</div>';
  searchResults.style.display = "block";

  const url =
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(query) /* make the text URL-safe */ +
    "&limit=6&addressdetails=1";

  fetch(url)
    .then(function (response) {
      return response.json(); /* parse the JSON response */
    })
    .then(function (results) {
      searchResults.innerHTML = ""; /* clear previous results */

      if (results.length === 0) {
        searchResults.innerHTML =
          '<div class="result-item"><i class="fa-solid fa-circle-exclamation"></i><div class="result-item-text"><span class="result-item-name">No results found</span><span class="result-item-detail">Try a different search term</span></div></div>';
        return;
      }

      /* Build one row per result */
      results.forEach(function (item) {
        const div = document.createElement("div");
        div.className = "result-item";

        /* Shorten the long display name to two parts */
        const parts = item.display_name.split(",");
        const title = parts[0].trim();
        const detail = parts.slice(1, 3).join(",").trim();

        div.innerHTML = `
          <i class="fa-solid fa-location-dot"></i>
          <div class="result-item-text">
            <span class="result-item-name">${title}</span>
            <span class="result-item-detail">${detail}</span>
          </div>
        `;

        /* Clicking a result: fly there, drop a marker, show info card */
        div.onclick = function () {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);

          map.flyTo([lat, lng], 16, {
            duration: 1.5,
          }); /* smooth animated zoom */

          /* Drop a marker at the search result */
          L.marker([lat, lng], { icon: createIcon("#1a73e8") })
            .addTo(map)
            .bindPopup(title)
            .openPopup();

          clickedLat = lat;
          clickedLng = lng;
          showInfoCard(title, lat.toFixed(5), lng.toFixed(5));
          searchResults.style.display = "none";
          clearBtn.style.display = "flex";
        };

        searchResults.appendChild(div);
      });

      searchResults.style.display = "block";
    })
    .catch(function () {
      searchResults.innerHTML =
        '<div class="result-item">Search failed. Check your internet.</div>';
    });
}

/* Hide the results dropdown when clicking anywhere else on the page */
document.addEventListener("click", function (e) {
  if (
    !e.target.closest("#search-box") &&
    !e.target.closest("#search-results")
  ) {
    searchResults.style.display = "none";
  }
});

/* ════════════════════════════════════════════════════════════
   5. GPS "MY LOCATION"
   ════════════════════════════════════════════════════════════ */

/* The blue dot marker for the user's position */
let locationMarker = null;

document.getElementById("locate-btn").onclick = function () {
  /*
    navigator.geolocation is built into every modern browser.
    getCurrentPosition() asks the user for permission, then
    calls our function with the GPS coordinates.
  */
  if (!navigator.geolocation) {
    showToast("Geolocation not supported by your browser");
    return;
  }

  showToast("Finding your location…");

  navigator.geolocation.getCurrentPosition(
    /* SUCCESS: we got the coordinates */
    function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      map.flyTo([lat, lng], 16, { duration: 1.5 });

      /* Remove previous location marker if it exists */
      if (locationMarker) map.removeLayer(locationMarker);

      /* Draw a pulsing blue circle like Google Maps */
      locationMarker = L.circleMarker([lat, lng], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1a73e8",
        fillOpacity: 0.9,
      }).addTo(map);

      locationMarker
        .bindPopup(
          "<strong>You are here</strong><br>" +
            lat.toFixed(5) +
            ", " +
            lng.toFixed(5),
        )
        .openPopup();

      clickedLat = lat;
      clickedLng = lng;
      showInfoCard("My Location", lat.toFixed(5), lng.toFixed(5));
      showToast("Location found!");
    },

    /* ERROR: permission denied or GPS unavailable */
    function (error) {
      const messages = {
        1: "Location access denied. Please allow it in your browser settings.",
        2: "Position unavailable. Try again.",
        3: "Location request timed out.",
      };
      showToast(messages[error.code] || "Could not get your location.");
    },
  );
};

/* ════════════════════════════════════════════════════════════
   6. DIRECTIONS  (Leaflet Routing Machine)
   ════════════════════════════════════════════════════════════ */

let routingControl = null; /* stores the current route on the map */
let directionProfile = "driving"; /* driving / cycling / walking */

function openDirections() {
  document.getElementById("directions-panel").style.display = "block";
  closeSidebar();
}

function closeDirections() {
  document.getElementById("directions-panel").style.display = "none";
  document.getElementById("route-summary").innerHTML = "";
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
}

/* Switch between driving / cycling / walking mode */
function setDirectionMode(btn, mode) {
  directionProfile = mode;
  /* Highlight the clicked button, unhighlight others */
  document.querySelectorAll(".mode-btn").forEach(function (b) {
    b.classList.remove("active");
  });
  btn.classList.add("active");
}

/*
  getRoute() geocodes both addresses, then asks the OSRM router
  (a free, open-source routing service) to find the best path.
*/
function getRoute() {
  const from = document.getElementById("from-input").value.trim();
  const to = document.getElementById("to-input").value.trim();

  if (!from || !to) {
    showToast("Please fill in both fields");
    return;
  }

  showToast("Calculating route…");

  /*
    We need GPS coordinates for both addresses.
    We use Nominatim to convert text → coordinates.
    Promise.all() runs both requests at the same time (faster).
  */
  const geocode = function (address) {
    return fetch(
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
        encodeURIComponent(address) +
        "&limit=1",
    ).then(function (r) {
      return r.json();
    });
  };

  Promise.all([geocode(from), geocode(to)])
    .then(function (data) {
      const startResult = data[0][0];
      const endResult = data[1][0];

      if (!startResult || !endResult) {
        showToast("Could not find one or both locations");
        return;
      }

      const startLatLng = L.latLng(
        parseFloat(startResult.lat),
        parseFloat(startResult.lon),
      );
      const endLatLng = L.latLng(
        parseFloat(endResult.lat),
        parseFloat(endResult.lon),
      );

      /* Remove previous route */
      if (routingControl) map.removeControl(routingControl);

      /* Draw the new route */
      routingControl = L.Routing.control({
        waypoints: [startLatLng, endLatLng],
        routeWhileDragging: true,
        show: false /* hide the turn-by-turn panel (we have our own) */,
        lineOptions: {
          styles: [{ color: "#1a73e8", weight: 5, opacity: 0.85 }],
        },
        createMarker: function (i, wp) {
          /* Custom start/end markers */
          const color = i === 0 ? "#1a73e8" : "#ea4335";
          return L.marker(wp.latLng, { icon: createIcon(color) });
        },
      }).addTo(map);

      /* When the route is ready, show distance + estimated time */
      routingControl.on("routesfound", function (e) {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(
          1,
        ); /* metres → km */
        const minutes = Math.round(route.summary.totalTime / 60);

        document.getElementById("route-summary").innerHTML = `
          <span><i class="fa-solid fa-road"></i> ${distance} km</span>
          <span><i class="fa-solid fa-clock"></i> ~${minutes} min</span>
        `;
        showToast("Route found: " + distance + " km");
      });
    })
    .catch(function () {
      showToast("Route calculation failed. Check your internet.");
    });
}

/* ════════════════════════════════════════════════════════════
   7. SIDEBAR OPEN / CLOSE
   ════════════════════════════════════════════════════════════ */

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-overlay").classList.add("visible");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-overlay").classList.remove("visible");
}

/* Menu button toggles the sidebar */
document.getElementById("menu-btn").onclick = function () {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
};

document.getElementById("sidebar-close").onclick = closeSidebar;

/* ════════════════════════════════════════════════════════════
   8. DARK MODE TOGGLE
   ════════════════════════════════════════════════════════════ */

let darkMode = false;

document.getElementById("dark-mode-btn").onclick = function () {
  darkMode = !darkMode;

  /* Toggle the "dark" class on <body> — CSS handles the rest */
  document.body.classList.toggle("dark", darkMode);

  /* Switch the moon icon ↔ sun icon */
  const icon = this.querySelector("i");
  icon.className = darkMode ? "fa-solid fa-sun" : "fa-solid fa-moon";

  /* If in dark mode, switch to the Dark tile layer */
  if (darkMode && currentLayer !== "Dark") {
    map.removeLayer(tileLayers[currentLayer]);
    tileLayers["Dark"].addTo(map);
    currentLayer = "Dark";
    document.getElementById("layer-label").textContent = "Dark";
    document.getElementById("current-layer-name").textContent =
      "Currently: Dark";
  } else if (!darkMode && currentLayer === "Dark") {
    map.removeLayer(tileLayers["Dark"]);
    tileLayers["Default"].addTo(map);
    currentLayer = "Default";
    document.getElementById("layer-label").textContent = "Default";
    document.getElementById("current-layer-name").textContent =
      "Currently: Default";
  }

  showToast(darkMode ? "Dark mode on" : "Dark mode off");
};

/* ════════════════════════════════════════════════════════════
   9. SAVED PLACES
   ════════════════════════════════════════════════════════════ */

/*
  savedPlaces is an array of objects.
  Each object has: name, lat, lng
*/
let savedPlaces = [{ name: "USTHB University", lat: 36.7122, lng: 3.1622 }];

/* Save the place currently shown in the info card */
function saveCurrentPlace() {
  const name = document.getElementById("info-title").textContent;

  /* Don't save the same place twice */
  const alreadySaved = savedPlaces.some(function (p) {
    return p.name === name;
  });
  if (alreadySaved) {
    showToast('"' + name + '" is already saved');
    return;
  }

  savedPlaces.push({ name: name, lat: clickedLat, lng: clickedLng });
  showToast('"' + name + '" saved!');
}

/* Open the saved places popup */
function showSavedPlaces() {
  const list = document.getElementById("saved-list");
  list.innerHTML = "";

  if (savedPlaces.length === 0) {
    list.innerHTML =
      '<div class="saved-empty"><i class="fa-regular fa-star" style="font-size:24px; display:block; margin-bottom:8px;"></i>No saved places yet.<br>Click "Save" on any location.</div>';
  } else {
    savedPlaces.forEach(function (place, index) {
      const div = document.createElement("div");
      div.className = "saved-item";
      div.innerHTML = `
        <i class="fa-solid fa-star"></i>
        <div>
          <div class="saved-item-text">${place.name}</div>
          <div class="saved-item-coords">${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}</div>
        </div>
      `;
      /* Clicking a saved place flies the map there */
      div.onclick = function () {
        map.flyTo([place.lat, place.lng], 15, { duration: 1.2 });
        showInfoCard(place.name, place.lat.toFixed(5), place.lng.toFixed(5));
        closeSavedPlaces();
      };
      list.appendChild(div);
    });
  }

  document.getElementById("saved-popup").style.display = "block";
  closeSidebar();
}

function closeSavedPlaces() {
  document.getElementById("saved-popup").style.display = "none";
}

/* ════════════════════════════════════════════════════════════
   10. NEARBY SEARCH
   ════════════════════════════════════════════════════════════ */

/*
  showNearby() searches for a category (restaurant, hospital…)
  near the current map centre using the Nominatim API.
*/
function showNearby(category) {
  const center = map.getCenter();
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(category + " Algiers") +
    "&limit=5";

  showToast("Searching for " + category + "s…");
  closeSidebar();

  fetch(url)
    .then(function (r) {
      return r.json();
    })
    .then(function (results) {
      if (results.length === 0) {
        showToast("No " + category + "s found nearby");
        return;
      }

      /* Place a marker for each result */
      results.forEach(function (item) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const name = item.display_name.split(",")[0];

        L.marker([lat, lng], { icon: createIcon("#ff6d00") })
          .addTo(map)
          .bindPopup("<strong>" + name + "</strong>");
      });

      showToast(
        "Found " +
          results.length +
          " " +
          category +
          (results.length > 1 ? "s" : ""),
      );
    })
    .catch(function () {
      showToast("Search failed. Check your internet.");
    });
}

/* ════════════════════════════════════════════════════════════
   11. QUICK NAVIGATION SHORTCUTS
   ════════════════════════════════════════════════════════════ */

function goHome() {
  map.flyTo([36.7122, 3.1622], 16, { duration: 1.5 });
  showInfoCard("Home – USTHB", "36.71220", "3.16220");
  closeSidebar();
}

function goWork() {
  map.flyTo([36.7347, 3.0458], 16, { duration: 1.5 });
  showInfoCard("Work – Grande Poste", "36.73470", "3.04580");
  closeSidebar();
}

function shareLocation() {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const url =
    "https://www.openstreetmap.org/#map=" +
    zoom +
    "/" +
    center.lat.toFixed(5) +
    "/" +
    center.lng.toFixed(5);

  /* navigator.clipboard writes to the user's clipboard */
  navigator.clipboard
    .writeText(url)
    .then(function () {
      showToast("Map link copied to clipboard!");
    })
    .catch(function () {
      showToast("Link: " + url);
    });

  closeSidebar();
}

function printMap() {
  window.print();
  closeSidebar();
}

/* ════════════════════════════════════════════════════════════
   12. BOTTOM TABS  (transport mode switcher)
   ════════════════════════════════════════════════════════════ */

function setTab(clickedTab, modeName) {
  /* Remove .active from every tab, add it only to the clicked one */
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.classList.remove("active");
  });
  clickedTab.classList.add("active");

  showToast("Mode: " + modeName);

  /*
    In a full app you would filter visible roads or show transit lines here.
    For now we just log the selection.
  */
  console.log("Transport mode selected:", modeName);
}

/* ════════════════════════════════════════════════════════════
   13. FULLSCREEN
   ════════════════════════════════════════════════════════════ */

function toggleFullscreen() {
  const icon = document.getElementById("fullscreen-icon");

  if (!document.fullscreenElement) {
    /* Request fullscreen — browser asks for permission once */
    document.documentElement.requestFullscreen().then(function () {
      icon.className =
        "fa-solid fa-compress"; /* change icon to exit-fullscreen */
      showToast("Fullscreen — press Esc to exit");
    });
  } else {
    document.exitFullscreen().then(function () {
      icon.className = "fa-solid fa-expand";
    });
  }
}

/* Update icon when user presses Esc to exit fullscreen */
document.addEventListener("fullscreenchange", function () {
  const icon = document.getElementById("fullscreen-icon");
  icon.className = document.fullscreenElement
    ? "fa-solid fa-compress"
    : "fa-solid fa-expand";
});

/* ════════════════════════════════════════════════════════════
   14. SCALE BAR  (bottom-left, shows real-world distance)
   ════════════════════════════════════════════════════════════ */

/*
  Leaflet gives us the map bounds.
  We calculate how many metres = 80 pixels, then display that.
*/

/* ════════════════════════════════════════════════════════════
   15. TOAST NOTIFICATION HELPER
   ════════════════════════════════════════════════════════════ */

let toastTimer = null; /* stores the timer so we can cancel it */

/*
  showToast(message) slides a small notification from the bottom,
  waits 2.5 seconds, then fades it out automatically.
*/
function showToast(message) {
  const toast = document.getElementById("toast");

  /* Cancel any existing toast timer so we don't overlap */
  if (toastTimer) clearTimeout(toastTimer);

  toast.textContent = message;
  toast.classList.add("show");

  /* After 2.5 seconds, hide the toast */
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2500);
}

/* ════════════════════════════════════════════════════════════
   16. KEYBOARD SHORTCUTS
   ════════════════════════════════════════════════════════════ */

document.addEventListener("keydown", function (e) {
  /* Ignore keyboard shortcuts when the user is typing in an input */
  if (e.target.tagName === "INPUT") return;

  switch (e.key) {
    case "Escape":
      closeInfoCard();
      closeSavedPlaces();
      closeDirections();
      closeSidebar();
      searchResults.style.display = "none";
      break;

    case "+":
    case "=" /* = is the unshifted + key */:
      map.zoomIn();
      break;

    case "-":
      map.zoomOut();
      break;

    case "f":
    case "F":
      toggleFullscreen();
      break;

    case "d":
    case "D":
      document.getElementById("dark-mode-btn").click();
      break;

    case "/":
      e.preventDefault(); /* stop the browser's built-in find */
      searchInput.focus();
      break;
  }
});

/* ════════════════════════════════════════════════════════════
   17. RESPONSIVE SIDEBAR BEHAVIOUR
   ════════════════════════════════════════════════════════════ */

/*
  On desktop (≥768px) the sidebar is always visible (CSS handles it).
  On mobile, it slides in/out.
  This JS watches the window size and resets the sidebar state
  when the user resizes from mobile to desktop.
*/
function handleResize() {
  const isDesktop = window.innerWidth >= 768;

  if (isDesktop) {
    /* On desktop: always show sidebar, hide the dark overlay */
    document.getElementById("sidebar-overlay").classList.remove("visible");
    /* Don't force .open — CSS position:relative makes it always visible */
  }
}

window.addEventListener("resize", handleResize);
handleResize(); /* run once on page load */

setTimeout(function () {
  map.invalidateSize();
}, 300);
