import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  content: {
    type: string;
    data: unknown;
  };
}

interface LayerControlsProps {
  layers: Layer[];
  onToggleLayer: (layer: Layer) => Promise<void>;
}

export function LayerControls({ layers, onToggleLayer }: LayerControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <CardTitle className="text-lg">Layer Controls</CardTitle>
      <div className="flex gap-4">
        {layers.map((layer) => (
          <Button
            key={layer.id}
            variant={layer.visible ? "default" : "outline"}
            onClick={() => onToggleLayer(layer)}
          >
            {layer.name}
          </Button>
        ))}
      </div>
    </div>
  );
} 