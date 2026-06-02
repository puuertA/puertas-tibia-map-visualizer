import { useEffect, useRef } from "react";
import L from "leaflet";

interface PlaceLabelsProps {
  map: L.Map | null;
  visible: boolean;
  floor: number;
}

interface PlaceLabel {
  name: string;
  x: number;
  y: number;
  size?: "small" | "large";
}

const SURFACE_FLOOR = 7;
const PANE_NAME = "placeLabelPane";
const SURFACE_MAP_HEIGHT = 2048;
const LABEL_GLOBAL_OFFSET_Y = 36;

const PLACE_LABELS: PlaceLabel[] = [
  { name: "Hrodmir", x: 330, y: 255 },
  { name: "Svargrond", x: 485, y: 230, size: "large" },
  { name: "Nibelor", x: 625, y: 170 },
  { name: "Grimlund", x: 735, y: 190 },
  { name: "Helheim", x: 760, y: 300 },
  { name: "Tyrsung", x: 650, y: 340 },
  { name: "Okolnir", x: 485, y: 435 },
  { name: "Barbarian Settlements", x: 275, y: 510 },
  { name: "Ice Islands", x: 370, y: 595 },
  { name: "Folda", x: 210, y: 675 },
  { name: "Senja", x: 410, y: 755 },
  { name: "Vega", x: 160, y: 835 },
  { name: "Fenrock", x: 835, y: 345 },
  { name: "Yalahar", x: 1135, y: 275, size: "large" },
  { name: "Chazorai", x: 1420, y: 170 },
  { name: "Northern Zao", x: 1600, y: 215 },
  { name: "Razzachai", x: 1430, y: 300 },
  { name: "Muggy Plains", x: 1650, y: 340 },
  { name: "Dragonblaze Peaks", x: 1640, y: 450 },
  { name: "Zao", x: 1635, y: 580, size: "large" },
  { name: "Zzaion", x: 1700, y: 680 },
  { name: "Farmine", x: 1360, y: 635, size: "large" },
  { name: "Vengoth", x: 1280, y: 620 },
  { name: "Mistrock", x: 900, y: 535 },
  { name: "Isle of Evil", x: 1050, y: 585 },
  { name: "Draconia", x: 1130, y: 700 },
  { name: "The Hive", x: 1970, y: 350 },
  { name: "Quirefang", x: 1910, y: 430 },
  { name: "Gray Beach", x: 1845, y: 430, size: "large" },
  { name: "Fiehonja", x: 2005, y: 470 },
  { name: "Rascacoon", x: 2190, y: 455 },
  { name: "The Wreckoning", x: 2350, y: 300 },
  { name: "Blue Valley", x: 2000, y: 590 },
  { name: "Issavi", x: 2325, y: 535, size: "large" },
  { name: "Kilmaresh", x: 2320, y: 690 },
  { name: "Krailos", x: 2025, y: 750, size: "large" },
  { name: "Oramond", x: 2080, y: 1000 },
  { name: "Rathleton", x: 2045, y: 1070, size: "large" },
  { name: "Furious Crater", x: 2320, y: 1030 },
  { name: "Eldoran's Luck", x: 2370, y: 1210 },
  { name: "Isle of Ada", x: 2350, y: 1270 },
  { name: "Devil's Reef", x: 2340, y: 1350 },
  { name: "Azzilon", x: 2340, y: 1510 },
  { name: "Ingol", x: 2220, y: 1640 },
  { name: "Marapur", x: 2165, y: 1875, size: "large" },
  { name: "Ab'Dendriel", x: 930, y: 775, size: "large" },
  { name: "Fields of Glory", x: 680, y: 820 },
  { name: "Carlin", x: 585, y: 900, size: "large" },
  { name: "Ghostlands", x: 470, y: 990 },
  { name: "Femor Hills", x: 860, y: 930 },
  { name: "Kazordoon", x: 875, y: 1080, size: "large" },
  { name: "Green Claw Swamp", x: 1050, y: 1160 },
  { name: "Mount Sternum", x: 725, y: 1240 },
  { name: "Thais", x: 600, y: 1305, size: "large" },
  { name: "Trolls' Cave", x: 745, y: 1360 },
  { name: "Jakundaf Desert", x: 980, y: 1260 },
  { name: "Outlaw Camp", x: 980, y: 1360 },
  { name: "Plains of Havoc", x: 1110, y: 1430 },
  { name: "Venore", x: 1315, y: 1185, size: "large" },
  { name: "Edron", x: 1545, y: 870, size: "large" },
  { name: "Cormaya", x: 1720, y: 1100 },
  { name: "Candia", x: 1800, y: 1230 },
  { name: "Feyrist", x: 1885, y: 1265, size: "large" },
  { name: "Roshamuul", x: 2030, y: 1465, size: "large" },
  { name: "Darashia", x: 1585, y: 1475, size: "large" },
  { name: "Darama", x: 1575, y: 1710 },
  { name: "Ankrahmun", x: 1530, y: 1870, size: "large" },
  { name: "Banuta", x: 1140, y: 1640 },
  { name: "Tiquanda", x: 1150, y: 1880, size: "large" },
  { name: "Port Hope", x: 955, y: 1930, size: "large" },
  { name: "Kha'zeel", x: 1390, y: 1700 },
  { name: "Chop", x: 1275, y: 1970 },
  { name: "Rookgaard", x: 240, y: 1325, size: "large" },
  { name: "Island of Destiny", x: 300, y: 1160 },
  { name: "Temple of Light", x: 170, y: 1180 },
  { name: "Isle of the Kings", x: 430, y: 1120 },
  { name: "Fibula", x: 410, y: 1535 },
  { name: "Meluna", x: 315, y: 1555 },
  { name: "Travora", x: 310, y: 1480 },
  { name: "Forbidden Islands", x: 240, y: 1715 },
  { name: "Meriana", x: 545, y: 1625 },
  { name: "Danduria", x: 485, y: 1845 },
  { name: "Liberty Bay", x: 510, y: 1905, size: "large" },
  { name: "Nargor", x: 230, y: 1990 },
  { name: "Laguna Islands", x: 760, y: 1985 },
  { name: "Treasure Island", x: 300, y: 1980 },
];

function makeIcon(label: PlaceLabel) {
  const width = Math.max(74, label.name.length * (label.size === "large" ? 10 : 8));

  return L.divIcon({
    className: "place-label-icon",
    html: `<span class="place-label-text ${label.size === "large" ? "place-label-large" : ""}">${label.name}</span>`,
    iconSize: [width, 24],
    iconAnchor: [width / 2, 12],
  });
}

export function PlaceLabels({ map, visible, floor }: PlaceLabelsProps) {
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!map.getPane(PANE_NAME)) {
      const pane = map.createPane(PANE_NAME);
      pane.style.zIndex = "610";
      pane.style.pointerEvents = "none";
    }

    const group = L.layerGroup();
    layerGroupRef.current = group;

    return () => {
      group.removeFrom(map);
      layerGroupRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !layerGroupRef.current) return;

    const group = layerGroupRef.current;
    group.clearLayers();

    if (!visible || floor !== SURFACE_FLOOR) {
      group.removeFrom(map);
      return;
    }

    PLACE_LABELS.forEach((label) => {
      L.marker([SURFACE_MAP_HEIGHT - label.y + LABEL_GLOBAL_OFFSET_Y, label.x], {
        pane: PANE_NAME,
        interactive: false,
        icon: makeIcon(label),
      }).addTo(group);
    });

    if (!map.hasLayer(group)) {
      group.addTo(map);
    }
  }, [map, visible, floor]);

  return null;
}
