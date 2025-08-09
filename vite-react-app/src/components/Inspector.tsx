import React, { useCallback } from 'react';
import { GraphNode, Connection, TerrainNodeType } from '../types';

interface InspectorProps {
  selectedNode: GraphNode | undefined;
  connections: Connection[];
  onUpdateNode?: (id: string, patch: Partial<GraphNode>) => void;
}

const NODE_TYPES: { value: TerrainNodeType; label: string; params: string[] }[] = [
  { value: 'noise', label: 'Noise', params: ['scale','amplitude'] },
  { value: 'add', label: 'Add', params: [] },
  { value: 'multiply', label: 'Multiply', params: [] },
  { value: 'clamp', label: 'Clamp', params: ['min','max'] },
  { value: 'output', label: 'Output', params: [] },
];

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, connections, onUpdateNode }) => {
  if (!selectedNode) {
    return <div className="inspector-panel empty">Wybierz node aby zobaczyć szczegóły.</div>;
  }
  const inCount = connections.filter(c => c.to.nodeId === selectedNode.id).length;
  const outCount = connections.filter(c => c.from.nodeId === selectedNode.id).length;
  const def = NODE_TYPES.find(t => t.value === selectedNode.nodeType);

  const update = useCallback((patch: Partial<GraphNode>) => {
    onUpdateNode && onUpdateNode(selectedNode.id, patch);
  }, [onUpdateNode, selectedNode.id]);

  const updateParam = (key: string, value: number) => {
    update({ params: { ...selectedNode.params, [key]: value } });
  };

  const switchType = (newType: TerrainNodeType) => {
    if (newType === selectedNode.nodeType) return;
    // reset params sensownie
    let params: Record<string, number> = {};
    if (newType === 'noise') params = { scale: 2, amplitude: 1 };
    if (newType === 'clamp') params = { min: 0, max: 1 };
    update({ nodeType: newType, params });
  };

  return (
    <div className="inspector-panel">
      <input
        className="inspector-title-input"
        value={selectedNode.title}
        onChange={e => update({ title: e.target.value })}
        placeholder="Node title"
      />
      <div className="meta-line"><span>ID:</span><code>{selectedNode.id}</code></div>
      <div className="meta-line"><span>Pozycja:</span><code>{Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}</code></div>
      <div className="meta-line"><span>Wejścia:</span><code>{selectedNode.inputs.length} ({inCount} użytych)</code></div>
      <div className="meta-line"><span>Wyjścia:</span><code>{selectedNode.outputs.length} ({outCount} użytych)</code></div>
      <div className="meta-line"><span>Typ:</span>
        <select value={selectedNode.nodeType} onChange={e => switchType(e.target.value as TerrainNodeType)}>
          {NODE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {def?.params.length ? (
        <div className="param-grid">
          {def.params.map(p => (
            <label key={p} className="param-item">
              <span>{p}</span>
              <input
                type="range"
                min={p==='amplitude'?0: p==='scale'?0.1: p==='min'? -2 : 0}
                max={p==='amplitude'?3: p==='scale'?10: p==='max'? 2 : 1}
                step={p==='scale'?0.1:0.01}
                value={selectedNode.params[p] ?? 0}
                onChange={e => updateParam(p, parseFloat(e.target.value))}
              />
              <code>{(selectedNode.params[p] ?? 0).toFixed(2)}</code>
            </label>
          ))}
        </div>
      ) : null}
      <div className="section-title">Ports</div>
      <ul className="ports-ul">
        {selectedNode.inputs.map(p => <li key={p.id}>IN: {p.label}</li>)}
        {selectedNode.outputs.map(p => <li key={p.id}>OUT: {p.label}</li>)}
      </ul>
    </div>
  );
};
