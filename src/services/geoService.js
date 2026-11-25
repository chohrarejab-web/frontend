import { LOCATIONS, GOVERNORATES_AR, TUNISIAN_GOVERNORATES, TUNISIA_COORDINATES } from '../data/tunisiaData.js';
import { fetchWithFallback } from './api.js';

export const ISO_TO_GOVERNORATE = {
  'TN-11': 'Tunis', 'TN-12': 'Ariana', 'TN-13': 'Ben Arous', 'TN-14': 'Manouba',
  'TN-21': 'Nabeul', 'TN-22': 'Zaghouan', 'TN-23': 'Bizerte', 'TN-31': 'Béja',
  'TN-32': 'Jendouba', 'TN-33': 'Le Kef', 'TN-34': 'Siliana', 'TN-41': 'Kairouan',
  'TN-42': 'Kasserine', 'TN-43': 'Sidi Bouzid', 'TN-51': 'Sousse', 'TN-52': 'Monastir',
  'TN-53': 'Mahdia', 'TN-61': 'Sfax', 'TN-71': 'Gafsa', 'TN-72': 'Tozeur',
  'TN-73': 'Kébili', 'TN-81': 'Gabès', 'TN-82': 'Médenine', 'TN-83': 'Tataouine'
};

export const AR_TO_GOVERNORATE = {
  'تونس': 'Tunis', 'أريانة': 'Ariana', 'بن عروس': 'Ben Arous', 'منوبة': 'Manouba',
  'نابل': 'Nabeul', 'زغوان': 'Zaghouan', 'بنزرت': 'Bizerte', 'باجة': 'Béja',
  'جندوبة': 'Jendouba', 'الكاف': 'Le Kef', 'سليانة': 'Siliana', 'سوسة': 'Sousse',
  'المنستير': 'Monastir', 'المهدية': 'Mahdia', 'صفاقس': 'Sfax', 'القيروان': 'Kairouan',
  'القصرين': 'Kasserine', 'سيدي بوزيد': 'Sidi Bouzid', 'قابس': 'Gabès', 'مدنين': 'Médenine',
  'تطاوين': 'Tataouine', 'قفصة': 'Gafsa', 'توزر': 'Tozeur', 'قبلي': 'Kébili'
};

export const GOV_CENTROIDS = [
  { name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { name: 'Ariana', lat: 36.8665, lng: 10.1652 },
  { name: 'Ben Arous', lat: 36.7533, lng: 10.2222 },
  { name: 'Manouba', lat: 36.8080, lng: 10.0967 },
  { name: 'Nabeul', lat: 36.4561, lng: 10.7376 },
  { name: 'Zaghouan', lat: 36.4029, lng: 10.1429 },
  { name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { name: 'Béja', lat: 36.7256, lng: 9.1817 },
  { name: 'Jendouba', lat: 36.5011, lng: 8.7802 },
  { name: 'Le Kef', lat: 36.1742, lng: 8.7049 },
  { name: 'Siliana', lat: 36.0848, lng: 9.3708 },
  { name: 'Sousse', lat: 35.8254, lng: 10.6369 },
  { name: 'Monastir', lat: 35.7770, lng: 10.8261 },
  { name: 'Mahdia', lat: 35.5047, lng: 11.0622 },
  { name: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
  { name: 'Kasserine', lat: 35.1676, lng: 8.8365 },
  { name: 'Sidi Bouzid', lat: 35.0382, lng: 9.4849 },
  { name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { name: 'Médenine', lat: 33.3549, lng: 10.4927 },
  { name: 'Tataouine', lat: 32.9333, lng: 10.4514 },
  { name: 'Gafsa', lat: 34.4250, lng: 8.7842 },
  { name: 'Tozeur', lat: 33.9197, lng: 8.1335 },
  { name: 'Kébili', lat: 33.7044, lng: 8.9690 }
];

export const POSTAL_CODES_TN = {
  // Tunis
  'Tunis': '1000', 'Bab El Bhar': '1000', 'Bab Souika': '1006', 'Lafayette': '1002',
  'Centre-Ville': '1000', 'El Menzah': '1004', 'El Menzah 1': '1004', 'El Menzah 4': '1004',
  'El Menzah 5': '2091', 'El Menzah 6': '2091', 'El Menzah 9': '1013', 'El Manar': '2092',
  'El Manar 1': '2092', 'El Manar 2': '2092', 'Mutuelleville': '1082', 'Centre Urbain Nord': '1082',
  'Les Berges du Lac': '1053', 'Les Berges du Lac 1': '1053', 'Les Berges du Lac 2': '1053',
  'La Marsa': '2070', 'Carthage': '2016', 'Sidi Bou Said': '2026', 'Le Bardo': '2000',
  'El Omrane': '1005', 'El Omrane Supérieur': '1091', 'Ettahrir': '2042', 'Cité El Khadra': '1003',
  // Ariana
  'Ariana': '2080', 'Ariana Ville': '2080', 'Ennasr': '2037', 'Ennasr 1': '2037', 'Ennasr 2': '2037',
  'La Soukra': '2036', 'Riadh El Andalous': '2058', 'Borj Louzir': '2073', 'Raoued': '2056',
  'Mnihla': '2094', 'Ettadhamen': '2042', 'Kalaat El Andalous': '2083', 'Sidi Thabet': '2020',
  // Ben Arous
  'Ben Arous': '2013', 'Megrine': '2033', 'Rades': '2040', 'Ezzahra': '2034',
  'Hammam Lif': '2050', 'Hammam Chott': '1164', 'Bou Mhel': '2097', 'El Mourouj': '2074',
  'Mornag': '2090', 'Fouchana': '2082', 'Mohamedia': '1145',
  // Manouba
  'Manouba': '2010', 'Denden': '2011', 'Oued Ellil': '2021', 'Tebourba': '1130',
  'Djedeida': '1124', 'Douar Hicher': '2084',
  // Nabeul
  'Nabeul': '8000', 'Hammamet': '8050', 'Kelibia': '8090', 'Dar Chaabane': '8011',
  'Grombalia': '8030', 'Korba': '8070', 'Menzel Temime': '8080', 'Soliman': '8020',
  // Zaghouan
  'Zaghouan': '1100', 'El Fahs': '1140', 'Nadhour': '1160',
  // Bizerte
  'Bizerte': '7000', 'Bizerte Nord': '7000', 'Bizerte Sud': '7000',
  'Menzel Bourguiba': '7050', 'Menzel Jemil': '7080', 'Ras Jebel': '7070', 'Mateur': '7030',
  // Béja
  'Béja': '9000', 'Béja Nord': '9000', 'Medjez El Bab': '9070', 'Testour': '9060',
  // Jendouba
  'Jendouba': '8100', 'Tabarka': '8110', 'Aïn Draham': '8130', 'Boussalem': '8170',
  // Le Kef
  'Le Kef': '7100', 'Dahmani': '7170', 'Tajerouine': '7150',
  // Siliana
  'Siliana': '6100', 'Makthar': '6140', 'Bou Arada': '6180',
  // Sousse
  'Sousse': '4000', 'Sousse Ville': '4000', 'Sousse Medina': '4000', 'Sousse Médina': '4000',
  'Sahloul': '4054', 'Sousse Jaouhara': '4054', 'Sousse Riadh': '4023',
  'Hammam Sousse': '4011', 'Kantaoui': '4089', 'Khezama': '4051', 'Msaken': '4070',
  'Kalaa Kebira': '4060', 'Kalaa Seghira': '4021',
  // Monastir
  'Monastir': '5000', 'Ksar Hellal': '5070', 'Moknine': '5050', 'Jemmal': '5020',
  'Téboulba': '5080', 'Sahline': '5012', 'Bekalta': '5090',
  // Mahdia
  'Mahdia': '5100', 'Ksour Essef': '5180', 'El Jem': '5160', 'Chebba': '5170',
  // Sfax
  'Sfax': '3000', 'Sfax Ville': '3000', 'Sfax Médina': '3000', 'Sakiet Ezzit': '3021',
  'Sakiet Eddaïer': '3011', 'Thyna': '3083', 'Agareb': '3030', 'Menzel Chaker': '3020',
  // Kairouan
  'Kairouan': '3100', 'Kairouan Nord': '3100', 'Kairouan Sud': '3100', 'Sbikha': '3110',
  // Kasserine
  'Kasserine': '1200', 'Sbeitla': '1250', 'Fériana': '1240',
  // Sidi Bouzid
  'Sidi Bouzid': '9100', 'Regueb': '9170', 'Jilma': '9110',
  // Gabès
  'Gabès': '6000', 'Gabès Ville': '6000', 'Matmata': '6070', 'Mareth': '6080',
  // Médenine
  'Médenine': '4100', 'Djerba': '4180', 'Houmt Souk': '4180', 'Midoun': '4116',
  'Ajim': '4135', 'Zarzis': '4170', 'Ben Guerdane': '4160',
  // Tataouine
  'Tataouine': '3200', 'Ghomrassen': '3220', 'Remada': '3240',
  // Gafsa
  'Gafsa': '2100', 'Métlaoui': '2130', 'Redeyef': '2120', 'El Ksar': '2111',
  // Tozeur
  'Tozeur': '2200', 'Nefta': '2240', 'Degache': '2260',
  // Kébili
  'Kébili': '4200', 'Douz': '4260', 'Souk Lahad': '4230'
};

export function findClosestGovernorate(lat, lng) {
  let closest = GOV_CENTROIDS[0].name;
  let minD = Infinity;
  for (const gov of GOV_CENTROIDS) {
    const d = Math.hypot(lat - gov.lat, lng - gov.lng);
    if (d < minD) {
      minD = d;
      closest = gov.name;
    }
  }
  return closest;
}

export function findClosestDelegation(lat, lng, gov) {
  const targetGov = gov || findClosestGovernorate(lat, lng);
  const delegationsDict = TUNISIA_COORDINATES?.delegations || {};
  let closest = '';
  let minD = Infinity;

  for (const [name, coords] of Object.entries(delegationsDict)) {
    const d = Math.hypot(lat - coords.lat, lng - coords.lng);
    if (d < minD) {
      minD = d;
      closest = name;
    }
  }

  if (closest && minD < 0.25) {
    return closest;
  }

  // Fallback to first delegation in target city from LOCATIONS
  const cityObj = (LOCATIONS || []).find(l => l.city.toLowerCase() === targetGov.toLowerCase());
  if (cityObj && Array.isArray(cityObj.delegations) && cityObj.delegations.length > 0) {
    return cityObj.delegations[0];
  }

  return targetGov;
}

export function matchOfficialDelegation(city, delegationRaw) {
  if (!delegationRaw) return '';
  const clean = String(delegationRaw)
    .replace(/^(معتمدية|délégation de|délégation)\s+/i, '')
    .trim();
  if (!clean) return '';

  const targetCity = (city || '').toLowerCase().replace(/^la\s+/, '').trim();
  const cityData = (LOCATIONS || []).find(l => {
    const c = (l.city || '').toLowerCase().replace(/^la\s+/, '').trim();
    return c === targetCity;
  });

  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cleanNorm = norm(clean);

  if (cityData && Array.isArray(cityData.delegations)) {
    // 1. Exact normalized match
    const exact = cityData.delegations.find(d => norm(d) === cleanNorm);
    if (exact) return exact;

    // 2. Partial match (contains or contained)
    const partial = cityData.delegations.find(d => {
      const dNorm = norm(d);
      return dNorm.includes(cleanNorm) || cleanNorm.includes(dNorm);
    });
    if (partial) return partial;
  }

  // Fallback across all Tunisia
  for (const loc of LOCATIONS || []) {
    if (Array.isArray(loc.delegations)) {
      const exact = loc.delegations.find(d => norm(d) === cleanNorm);
      if (exact) return exact;
      const partial = loc.delegations.find(d => {
        const dNorm = norm(d);
        return dNorm.includes(cleanNorm) || cleanNorm.includes(dNorm);
      });
      if (partial) return partial;
    }
  }

  return clean;
}

/**
 * Robust Multi-Tiered Reverse Geocoder for Tunisia
 * Tier 1: Local Backend Reverse Proxy (/api/geo/reverse)
 * Tier 2: BigDataCloud Free Client Reverse Geocoding API (Full browser CORS support)
 * Tier 3: Direct OpenStreetMap Nominatim
 * Tier 4: Local Spatial & Haversine fallback from tunisiaData.js
 */
export async function reverseGeocodeFromCoordinates(lat, lng, isAr = false) {
  const safeLat = parseFloat(Number(lat).toFixed(4));
  const safeLng = parseFloat(Number(lng).toFixed(4));
  const langParam = isAr ? 'ar' : 'fr';

  // ─────────────────────────────────────────────────────────────
  // Tier 1: Server-side proxy (bypasses browser CORS & User-Agent restrictions)
  // ─────────────────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const proxyRes = await fetchWithFallback(`/api/geo/reverse?lat=${safeLat}&lon=${safeLng}&lang=${langParam}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.success && json.data && json.data.address) {
        return parseOsmAddress(json.data, safeLat, safeLng, isAr);
      }
    }
  } catch (err) {
    // Backend proxy not reachable or timed out, continue to Tier 2
  }

  // ─────────────────────────────────────────────────────────────
  // Tier 2: BigDataCloud Free Client Reverse Geocode (100% CORS supported)
  // ─────────────────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${safeLat}&longitude=${safeLng}&localityLanguage=${langParam}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      if (bdcData && (bdcData.principalSubdivision || bdcData.city)) {
        return parseBigDataCloud(bdcData, safeLat, safeLng, isAr);
      }
    }
  } catch (err) {
    // BigDataCloud failed, continue to Tier 3
  }

  // ─────────────────────────────────────────────────────────────
  // Tier 3: Direct Nominatim (standard fetch without custom User-Agent to avoid preflight 403)
  // ─────────────────────────────────────────────────────────────
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${safeLat}&lon=${safeLng}&addressdetails=1&accept-language=${langParam},en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      if (osmData && osmData.address) {
        return parseOsmAddress(osmData, safeLat, safeLng, isAr);
      }
    }
  } catch (err) {
    // Direct OSM failed, fallback to Tier 4
  }

  // ─────────────────────────────────────────────────────────────
  // Tier 4: Offline Spatial Haversine Fallback from tunisiaData
  // ─────────────────────────────────────────────────────────────
  const fallbackGov = findClosestGovernorate(safeLat, safeLng);
  const fallbackDelegation = findClosestDelegation(safeLat, safeLng, fallbackGov);
  const fallbackPostal = POSTAL_CODES_TN[fallbackDelegation] || POSTAL_CODES_TN[fallbackGov] || '1000';
  const fallbackAddress = isAr
    ? `شارع رئيسي، ${fallbackDelegation}`
    : `Avenue principale, ${fallbackDelegation}`;

  return {
    success: true,
    city: fallbackGov,
    delegation: fallbackDelegation,
    postal: fallbackPostal,
    address: fallbackAddress,
    isFallback: true
  };
}

/**
 * Parse OpenStreetMap Nominatim address object
 */
function parseOsmAddress(data, lat, lng, isAr) {
  const a = data.address || {};

  // 1. Resolve Governorate
  let gov = null;
  if (a['ISO3166-2-lvl4'] && ISO_TO_GOVERNORATE[a['ISO3166-2-lvl4']]) {
    gov = ISO_TO_GOVERNORATE[a['ISO3166-2-lvl4']];
  }
  if (!gov && a.state) {
    for (const [arKey, frVal] of Object.entries(AR_TO_GOVERNORATE)) {
      if (a.state.includes(arKey)) { gov = frVal; break; }
    }
  }
  if (!gov && a.state) {
    const clean = a.state.toLowerCase().replace(/gouvernorat|wilaya|ولاية|de\s+|d'/gi, '').trim();
    const match = GOV_CENTROIDS.find(g => clean.includes(g.name.toLowerCase()) || g.name.toLowerCase().includes(clean));
    if (match) gov = match.name;
  }
  if (!gov || !TUNISIAN_GOVERNORATES.includes(gov)) {
    gov = findClosestGovernorate(lat, lng);
  }

  // 2. Resolve Delegation
  let delegationRaw = a.state_district || a.city_district || a.suburb || a.county || a.neighbourhood || a.town || a.village || '';
  const cleanDelegation = delegationRaw.replace(/^(معتمدية|délégation de|délégation)\s+/i, '').trim();
  let delegation = matchOfficialDelegation(gov, cleanDelegation) || cleanDelegation;
  if (!delegation) {
    delegation = findClosestDelegation(lat, lng, gov);
  }

  // 3. Resolve Postal Code
  let postal = (a.postcode || '').trim();
  if (!postal || postal.length < 4) {
    postal = POSTAL_CODES_TN[delegation] || POSTAL_CODES_TN[gov] || '1000';
  }

  // 4. Resolve Physical Street Address
  let streetParts = [];
  if (a.house_number) streetParts.push(a.house_number);
  if (a.road) streetParts.push(a.road);
  const place = a.commercial || a.amenity || a.building || a.office || a.residential;
  if (place && (!a.road || !place.includes(a.road))) {
    streetParts.push(place);
  }

  let streetAddress = streetParts.join(' ').trim();
  if (!streetAddress) {
    if (a.suburb) streetAddress = `${isAr ? 'حي' : 'Cité'} ${a.suburb}`;
    else if (data.name) streetAddress = data.name;
    else if (data.display_name) streetAddress = data.display_name.split(',')[0].trim();
    else streetAddress = isAr ? `شارع رئيسي، ${delegation}` : `Avenue principale, ${delegation}`;
  }

  return {
    success: true,
    address: streetAddress,
    city: gov,
    delegation: delegation,
    postal: postal,
    raw: data
  };
}

/**
 * Parse BigDataCloud Client response
 */
function parseBigDataCloud(d, lat, lng, isAr) {
  const govCode = d.principalSubdivisionCode || '';
  let gov = ISO_TO_GOVERNORATE[govCode];

  if (!gov && d.principalSubdivision) {
    for (const [arKey, frVal] of Object.entries(AR_TO_GOVERNORATE)) {
      if (d.principalSubdivision.includes(arKey)) { gov = frVal; break; }
    }
  }
  if (!gov && d.city) {
    const match = TUNISIAN_GOVERNORATES.find(g => g.toLowerCase() === d.city.toLowerCase());
    if (match) gov = match;
  }
  if (!gov || !TUNISIAN_GOVERNORATES.includes(gov)) {
    gov = findClosestGovernorate(lat, lng);
  }

  // Resolve delegation
  let rawLoc = d.locality || d.city || '';
  let delegation = rawLoc.replace(/^(délégation de|معتمدية|délégation)\s+/i, '').trim();
  delegation = matchOfficialDelegation(gov, delegation) || delegation;
  if (!delegation) {
    delegation = findClosestDelegation(lat, lng, gov);
  }

  let postal = (d.postcode || '').trim();
  if (!postal || postal.length < 4) {
    postal = POSTAL_CODES_TN[delegation] || POSTAL_CODES_TN[gov] || '1000';
  }

  let streetAddress = isAr
    ? `نهج في ${delegation}، ${GOVERNORATES_AR[gov] || gov}`
    : `Avenue principale, ${delegation}`;

  return {
    success: true,
    city: gov,
    delegation: delegation,
    postal: postal,
    address: streetAddress,
    raw: d
  };
}

/**
 * Search Location in Tunisia (Supports Arabic & French)
 */
export async function searchTunisiaLocation(query, isAr = false) {
  if (!query || !query.trim()) return null;
  const q = query.trim();
  const langParam = isAr ? 'ar' : 'fr';

  // 1. Try Backend search proxy
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetchWithFallback(`/api/geo/search?q=${encodeURIComponent(q)}&lang=${langParam}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data[0];
      }
    }
  } catch (err) {}

  // 2. Instant Local Search in tunisiaData.js (0ms latency, 100% offline accuracy)
  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cleanQ = norm(q);

  // Check Arabic governorates
  for (const [frGov, arGov] of Object.entries(GOVERNORATES_AR)) {
    if (q.includes(arGov) || arGov.includes(q)) {
      const coords = TUNISIA_COORDINATES?.governorates?.[frGov];
      if (coords) return { name: arGov, lat: coords.lat, lon: coords.lng };
    }
  }

  // Check Delegations
  for (const [name, coords] of Object.entries(TUNISIA_COORDINATES?.delegations || {})) {
    if (norm(name).includes(cleanQ) || cleanQ.includes(norm(name))) {
      return { name, lat: coords.lat, lon: coords.lng };
    }
  }

  // Check Governorates
  for (const [name, coords] of Object.entries(TUNISIA_COORDINATES?.governorates || {})) {
    if (norm(name).includes(cleanQ) || cleanQ.includes(norm(name))) {
      return { name, lat: coords.lat, lon: coords.lng };
    }
  }

  // 3. Fallback to direct OSM search without custom headers
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q + ', Tunisie')}&countrycodes=tn&addressdetails=1&accept-language=${langParam},en`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    }
  } catch (err) {}

  return null;
}
