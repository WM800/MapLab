import React from 'react';
import { GraphNode, Connection } from '../types';

interface InspectorProps {
  selectedNode: GraphNode | undefined;
  connections: Connection[];
}

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, connections }) => {
  if (!selectedNode) {
    return <div className="inspector-panel empty">Wybierz node aby zobaczyć szczegóły.</div>;
  }
  const inCount = connections.filter(c => c.to.nodeId === selectedNode.id).length;
  const outCount = connections.filter(c => c.from.nodeId === selectedNode.id).length;
  return (
    <div className="inspector-panel">
      <h2>{selectedNode.title}</h2>
      <div className="meta-line"><span>ID:</span><code>{selectedNode.id}</code></div>
      <div className="meta-line"><span>Pozycja:</span><code>{Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}</code></div>
      <div className="meta-line"><span>Wejścia:</span><code>{selectedNode.inputs.length} ({inCount} użytych)</code></div>
      <div className="meta-line"><span>Wyjścia:</span><code>{selectedNode.outputs.length} ({outCount} użytych)</code></div>
      <div className="section-title">Ports</div>
      <ul className="ports-ul">
        {selectedNode.inputs.map(p => <li key={p.id}>IN: {p.label}</li>)}
        {selectedNode.outputs.map(p => <li key={p.id}>OUT: {p.label}</li>)}
      </ul>
    </div>
  );
};
