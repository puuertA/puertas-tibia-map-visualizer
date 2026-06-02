import { useEffect, useState } from "react";
import { getProcessedFloors } from "../services/api";

interface FloorSelectorProps {
  floor?: number;
  onFloorChange?: (floor: number) => void;
}

function toTibiaLevelLabel(floor: number) {
  const delta = 7 - floor;
  if (delta === 0) return "nível 0";
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

export function FloorSelector({ floor = 7, onFloorChange }: FloorSelectorProps) {
  const [floors, setFloors] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadFloors();
  }, []);

  useEffect(() => {
    if (floors.length > 0 && !floors.includes(floor)) {
      onFloorChange?.(floors[0]);
    }
  }, [floor, floors, onFloorChange]);

  async function loadFloors() {
    try {
      setLoading(true);
      const processedFloors = await getProcessedFloors();
      setFloors(processedFloors);

      if (processedFloors.length > 0 && !processedFloors.includes(floor)) {
        onFloorChange?.(processedFloors[0]);
      }
    } catch (error) {
      console.error("Erro ao carregar andares:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleFloorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newFloor = parseInt(e.target.value, 10);
    onFloorChange?.(newFloor);
  }

  if (loading) {
    return (
      <section className="panel" data-tour="floors">
        <h3>Andar</h3>
        <p>Carregando andares...</p>
      </section>
    );
  }

  if (floors.length === 0) {
    return (
      <section className="panel" data-tour="floors">
        <h3>Andar</h3>
        <p style={{ color: "#ff6b6b" }}>Nenhum andar disponível</p>
      </section>
    );
  }

  return (
    <section className="panel" data-tour="floors">
      <h3>Andar</h3>
      <select value={floor} onChange={handleFloorChange}>
        {floors.map((f) => (
          <option key={f} value={f}>
            Arquivo {f} | Tibia {toTibiaLevelLabel(f)}
          </option>
        ))}
      </select>
    </section>
  );
}
