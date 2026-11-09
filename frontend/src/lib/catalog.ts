export type Locale = "de" | "en";
export type Copy = Record<Locale, string>;

export type Condition = "new" | "used" | "refurbished" | "parts";
export type Testing = "tested" | "working" | "untested" | "defective" | "partial" | "unknown";

export type Product = {
  slug: string;
  name: Copy;
  summary: Copy;
  manufacturer: string;
  partNumber: string;
  model: string;
  sku: string;
  serial: string;
  condition: Condition;
  testing: Testing;
  price: number;
  stock: number;
  category: string;
  weight: string;
  dimensions: string;
  notes: Copy;
  specs: { label: Copy; value: string }[];
};

export type Auction = {
  slug: string;
  productSlug: string;
  seller: "jala" | "external";
  sellerName: string;
  type: "live" | "scheduled" | "timed";
  status: "live" | "upcoming" | "ended";
  startingPrice: number;
  currentBid: number;
  increment: number;
  buyNow: number | null;
  hasReserve: boolean;
  endsInMinutes: number;
  bids: { bidder: string; amount: number; ago: Copy }[];
};

export const categories: { slug: string; name: Copy; count: number }[] = [
  { slug: "drives", name: { de: "Antriebe & Umrichter", en: "Drives & inverters" }, count: 3 },
  { slug: "plc", name: { de: "Steuerungen", en: "PLCs" }, count: 1 },
  { slug: "hmi", name: { de: "Bedienpanels", en: "HMI panels" }, count: 1 },
  { slug: "switchgear", name: { de: "Schaltgeräte", en: "Switchgear" }, count: 2 },
  { slug: "servo", name: { de: "Servo & CNC", en: "Servo & CNC" }, count: 1 },
  { slug: "spares", name: { de: "Ersatzteile", en: "Spare parts" }, count: 1 },
];

export const brands = ["Siemens", "ABB", "Schneider Electric", "Allen-Bradley", "Fanuc", "Lenze"];

export const products: Product[] = [
  {
    slug: "sinamics-g120c",
    name: { de: "SINAMICS G120C Umrichter", en: "SINAMICS G120C drive" },
    summary: { de: "Kompakter Frequenzumrichter für Pumpen, Lüfter und Fördertechnik.", en: "Compact frequency drive for pumps, fans, and conveyors." },
    manufacturer: "Siemens",
    partNumber: "6SL3210-1KE21-3AF2",
    model: "G120C",
    sku: "JALA-DRV-1044",
    serial: "SZN9K44120",
    condition: "used",
    testing: "tested",
    price: 640,
    stock: 4,
    category: "drives",
    weight: "3.8 kg",
    dimensions: "230 × 150 × 170 mm",
    notes: { de: "Leichte Gebrauchsspuren am Gehäuse. Lüfter frei, keine Fehlermeldungen im Testlauf.", en: "Light housing marks. Fan clear, no faults during the test run." },
    specs: [
      { label: { de: "Leistung", en: "Power" }, value: "5.5 kW" },
      { label: { de: "Versorgung", en: "Supply" }, value: "3 AC 380–480 V" },
      { label: { de: "Filter", en: "Filter" }, value: "Class A" },
    ],
  },
  {
    slug: "s7-1515",
    name: { de: "SIMATIC S7-1500 CPU 1515-2 PN", en: "SIMATIC S7-1500 CPU 1515-2 PN" },
    summary: { de: "Zentrale Steuerung mit zwei Profinet-Schnittstellen.", en: "Central controller with two PROFINET interfaces." },
    manufacturer: "Siemens",
    partNumber: "6ES7515-2AM02-0AB0",
    model: "CPU 1515-2 PN",
    sku: "JALA-PLC-2201",
    serial: "SVP441908",
    condition: "refurbished",
    testing: "tested",
    price: 1890,
    stock: 2,
    category: "plc",
    weight: "0.9 kg",
    dimensions: "147 × 35 × 129 mm",
    notes: { de: "Werkseitig zurückgesetzt. Speicherkarte nicht enthalten.", en: "Factory reset. Memory card not included." },
    specs: [
      { label: { de: "Arbeitsspeicher", en: "Work memory" }, value: "500 KB Program / 3 MB Data" },
      { label: { de: "Schnittstellen", en: "Interfaces" }, value: "2× PROFINET" },
    ],
  },
  {
    slug: "acs580",
    name: { de: "ACS580 Frequenzumrichter", en: "ACS580 frequency drive" },
    summary: { de: "ABB Standardumrichter mit Schaltschrankmontage.", en: "ABB standard drive for cabinet mounting." },
    manufacturer: "ABB",
    partNumber: "ACS580-01-012A-4",
    model: "ACS580-01",
    sku: "JALA-DRV-1180",
    serial: "—",
    condition: "used",
    testing: "working",
    price: 720,
    stock: 3,
    category: "drives",
    weight: "6.1 kg",
    dimensions: "400 × 125 × 220 mm",
    notes: { de: "Laut Verkäufer im Betrieb gelaufen. Nicht erneut auf dem Prüfstand.", en: "Ran in service according to the seller. Not retested on our bench." },
    specs: [
      { label: { de: "Nennstrom", en: "Rated current" }, value: "12 A" },
      { label: { de: "Schutzart", en: "Protection" }, value: "IP21" },
    ],
  },
  {
    slug: "ktp700",
    name: { de: "SIMATIC KTP700 Basic", en: "SIMATIC KTP700 Basic" },
    summary: { de: "7-Zoll-Panel mit Touch und Tasten für Basisanwendungen.", en: "7-inch panel with touch and keys for basic applications." },
    manufacturer: "Siemens",
    partNumber: "6AV2123-2GA03-0AX0",
    model: "KTP700 Basic",
    sku: "JALA-HMI-3310",
    serial: "SPN22014",
    condition: "used",
    testing: "partial",
    price: 410,
    stock: 1,
    category: "hmi",
    weight: "0.8 kg",
    dimensions: "214 × 158 × 45 mm",
    notes: { de: "Eine Folientaste hakt. Touch und Anzeige geprüft.", en: "One membrane key sticks. Touch and display tested." },
    specs: [
      { label: { de: "Display", en: "Display" }, value: "7\" TFT" },
      { label: { de: "Schnittstelle", en: "Interface" }, value: "PROFINET" },
    ],
  },
  {
    slug: "lc1d25",
    name: { de: "TeSys D Schütz", en: "TeSys D contactor" },
    summary: { de: "Leistungsschütz für Motorabgänge bis 25 A.", en: "Power contactor for motor feeders up to 25 A." },
    manufacturer: "Schneider Electric",
    partNumber: "LC1D25BD",
    model: "LC1D25",
    sku: "JALA-SWG-0902",
    serial: "—",
    condition: "new",
    testing: "tested",
    price: 86,
    stock: 18,
    category: "switchgear",
    weight: "0.37 kg",
    dimensions: "85 × 45 × 90 mm",
    notes: { de: "Originalverpackt. Spule 24 V DC.", en: "Original packaging. 24 V DC coil." },
    specs: [
      { label: { de: "Bemessungsstrom", en: "Rated current" }, value: "25 A AC-3" },
      { label: { de: "Spule", en: "Coil" }, value: "24 V DC" },
    ],
  },
  {
    slug: "powerflex",
    name: { de: "PowerFlex 753 Umrichter", en: "PowerFlex 753 drive" },
    summary: { de: "Modularer Umrichter für anspruchsvolle Antriebsaufgaben.", en: "Modular drive for demanding motor control." },
    manufacturer: "Allen-Bradley",
    partNumber: "20F1ANC205JN0NNNNN",
    model: "PowerFlex 753",
    sku: "JALA-DRV-1412",
    serial: "ABPF753992",
    condition: "used",
    testing: "untested",
    price: 1540,
    stock: 1,
    category: "drives",
    weight: "12.4 kg",
    dimensions: "400 × 220 × 250 mm",
    notes: { de: "Aus Anlagenrückbau. Kein Funktionstest durchgeführt.", en: "Removed from a decommissioned line. No functional test performed." },
    specs: [
      { label: { de: "Norm", en: "Rating" }, value: "ND 20 Hp" },
      { label: { de: "Gehäuse", en: "Enclosure" }, value: "IP20" },
    ],
  },
  {
    slug: "fanuc-servo",
    name: { de: "Fanuc Servoverstärker", en: "Fanuc servo amplifier" },
    summary: { de: "Achsverstärker für Fanuc CNC-Maschinen.", en: "Axis amplifier for Fanuc CNC machines." },
    manufacturer: "Fanuc",
    partNumber: "A06B-6079-H106",
    model: "SVM1-40",
    sku: "JALA-SRV-0771",
    serial: "FNC18820",
    condition: "refurbished",
    testing: "tested",
    price: 980,
    stock: 2,
    category: "servo",
    weight: "4.6 kg",
    dimensions: "380 × 90 × 300 mm",
    notes: { de: "Kondensatoren geprüft, Lüfter ersetzt.", en: "Capacitors checked, fan replaced." },
    specs: [
      { label: { de: "Achse", en: "Axis" }, value: "1-axis" },
      { label: { de: "Eingang", en: "Input" }, value: "283–325 V DC" },
    ],
  },
  {
    slug: "lenze-i550",
    name: { de: "Lenze i550 Schaltschrankgerät", en: "Lenze i550 cabinet inverter" },
    summary: { de: "Kompakter Umrichter für Serienmaschinen.", en: "Compact inverter for series machines." },
    manufacturer: "Lenze",
    partNumber: "I55AE125F1",
    model: "i550",
    sku: "JALA-SPR-0550",
    serial: "—",
    condition: "parts",
    testing: "defective",
    price: 190,
    stock: 1,
    category: "spares",
    weight: "2.2 kg",
    dimensions: "200 × 120 × 160 mm",
    notes: { de: "Fehler F05 nach dem Einschalten. Verkauf nur als Ersatzteilspender.", en: "Fault F05 on power-up. Sold for parts only." },
    specs: [
      { label: { de: "Leistung", en: "Power" }, value: "0.55 kW" },
      { label: { de: "Phasen", en: "Phases" }, value: "1 AC 230 V" },
    ],
  },
];

export const auctions: Auction[] = [
  {
    slug: "g120c-live",
    productSlug: "sinamics-g120c",
    seller: "jala",
    sellerName: "Jala",
    type: "live",
    status: "live",
    startingPrice: 280,
    currentBid: 390,
    increment: 10,
    buyNow: 610,
    hasReserve: true,
    endsInMinutes: 46,
    bids: [
      { bidder: "M··· H.", amount: 390, ago: { de: "vor 4 Min.", en: "4 min ago" } },
      { bidder: "K··· S.", amount: 370, ago: { de: "vor 18 Min.", en: "18 min ago" } },
      { bidder: "A··· B.", amount: 320, ago: { de: "vor 1 Std.", en: "1 hr ago" } },
    ],
  },
  {
    slug: "s7-timed",
    productSlug: "s7-1515",
    seller: "jala",
    sellerName: "Jala",
    type: "timed",
    status: "live",
    startingPrice: 900,
    currentBid: 1210,
    increment: 20,
    buyNow: null,
    hasReserve: true,
    endsInMinutes: 180,
    bids: [
      { bidder: "T··· R.", amount: 1210, ago: { de: "vor 22 Min.", en: "22 min ago" } },
      { bidder: "L··· K.", amount: 1100, ago: { de: "vor 3 Std.", en: "3 hr ago" } },
    ],
  },
  {
    slug: "acs580-nord",
    productSlug: "acs580",
    seller: "external",
    sellerName: "Nordwerk Automation GmbH",
    type: "scheduled",
    status: "live",
    startingPrice: 250,
    currentBid: 340,
    increment: 10,
    buyNow: 690,
    hasReserve: false,
    endsInMinutes: 300,
    bids: [{ bidder: "P··· D.", amount: 340, ago: { de: "vor 40 Min.", en: "40 min ago" } }],
  },
  {
    slug: "fanuc-upcoming",
    productSlug: "fanuc-servo",
    seller: "external",
    sellerName: "Rhein Maschinenhandel",
    type: "scheduled",
    status: "upcoming",
    startingPrice: 400,
    currentBid: 400,
    increment: 20,
    buyNow: null,
    hasReserve: true,
    endsInMinutes: 60 * 26,
    bids: [],
  },
];

export function productBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function auctionBySlug(slug: string) {
  return auctions.find((auction) => auction.slug === slug);
}

export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}
