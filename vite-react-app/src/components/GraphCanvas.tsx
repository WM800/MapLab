import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GraphNode, Connection, PendingConnection } from '../types';

interface GraphCanvasProps {
  nodes: GraphNode[];
  connections: Connection[];
  pending: PendingConnection | null;
  onNodePositionChange: (id: string, x: number, y: number) => void;
  onStartFromOutput: (nodeId: string, portId: string) => void;
  onStartFromInput: (nodeId: string, portId: string) => void;
  onConnectToInput: (nodeId: string, portId: string) => void;
  onConnectToOutput: (nodeId: string, portId: string) => void;
  onCancelPending: () => void;
  selectedNodeId: string;
  onSelectNode: (id: string) => void;
  onRemoveConnection?: (id: string) => void;
}

interface DragState { id: string; offsetX: number; offsetY: number; }

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  connections,
  pending,
  onNodePositionChange,
  onStartFromOutput,
  onStartFromInput,
  onConnectToInput,
  onConnectToOutput,
  onCancelPending,
  selectedNodeId,
  onSelectNode,
  onRemoveConnection
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [hoverPort, setHoverPort] = useState<{ nodeId: string; portId: string; dir: 'in' | 'out' } | null>(null);
  const [view, setView] = useState({ offsetX: 0, offsetY: 0, scale: 1 });
  const panningRef = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left - view.offsetX) / view.scale;
    const y = (e.clientY - rect.top - view.offsetY) / view.scale;
    setCursorPos({ x, y });
    if (drag) {
      onNodePositionChange(drag.id, x - drag.offsetX, y - drag.offsetY);
    }
    if (panningRef.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setView(v => ({ ...v, offsetX: v.offsetX + dx, offsetY: v.offsetY + dy }));
    }
  }, [drag, onNodePositionChange, view.offsetX, view.offsetY, view.scale]);

  const onMouseUp = useCallback(() => {
    setDrag(null);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelPending();
    };
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onMouseUp, onCancelPending]);

  const startDrag = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrag({ id: node.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
    onSelectNode(node.id);
  };

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 1 && (e.button !== 0 || e.shiftKey === false)) return; // środkowy lub shift+LPM
    panningRef.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setView(v => {
      const newScale = Math.min(2.5, Math.max(0.4, v.scale * scaleFactor));
      return { ...v, scale: newScale };
    });
  };

  const startConnection = (e: React.MouseEvent, nodeId: string, portId: string, type: 'in' | 'out') => {
    e.stopPropagation();
    if (pending) return; // już w trakcie
    if (type === 'out') onStartFromOutput(nodeId, portId); else onStartFromInput(nodeId, portId);
  };

  const finishConnection = (e: React.MouseEvent, nodeId: string, portId: string, type: 'in' | 'out') => {
    e.stopPropagation();
    if (!pending) return;
    // Dozwolone połączenia: output -> input (dowolnych różnych node'ów)
    if (pending.from && type === 'in') {
      if (pending.from.nodeId === nodeId) { onCancelPending(); return; } // blokada self-loop
      onConnectToInput(nodeId, portId);
    } else if (pending.to && type === 'out') {
      if (pending.to.nodeId === nodeId) { onCancelPending(); return; }
      onConnectToOutput(nodeId, portId);
    } else {
      onCancelPending();
    }
  };

  const cancel = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancelPending();
      onSelectNode('');
    }
    panningRef.current = false;
  };

  const strokeFor = (c: Connection) => '#3b82f6';

  const getOutputCoord = (node: GraphNode, portId: string) => {
    const idx = node.outputs.findIndex(p => p.id === portId);
    return { x: node.x + 180, y: node.y + 34 + idx * 22 };
  };
  const getInputCoord = (node: GraphNode, portId: string) => {
    const idx = node.inputs.findIndex(p => p.id === portId);
    return { x: node.x, y: node.y + 34 + idx * 22 };
  };
  const cubicPath = (from: {x:number,y:number}, to:{x:number,y:number}) => {
    const midX = (from.x + to.x) / 2;
    return `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
  };

  return (
    <div className="graph-canvas" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseDown={cancel} onWheel={onWheel}>
      <div className="graph-inner" style={{ transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`, transformOrigin:'0 0', width:'100%', height:'100%' }} onMouseDown={startPan}>
      <svg ref={svgRef} className="graph-svg">
        {connections.map(c => {
          const fromNode = nodes.find(n => n.id === c.from.nodeId);
          const toNode = nodes.find(n => n.id === c.to.nodeId);
          if (!fromNode || !toNode) return null;
          const from = getOutputCoord(fromNode, c.from.portId);
          const to = getInputCoord(toNode, c.to.portId);
          return <path key={c.id} d={cubicPath(from, to)} stroke={strokeFor(c)} fill="none" strokeWidth={2} className="conn-path" data-id={c.id} onClick={e => { e.stopPropagation(); onRemoveConnection && onRemoveConnection(c.id); }} />;
        })}
        {pending?.from && (() => {
          const n = nodes.find(nn => nn.id === pending.from!.nodeId);
          if (!n) return null;
          const start = getOutputCoord(n, pending.from.portId);
          const path = cubicPath(start, cursorPos);
          return <path d={path} stroke="#3b82f6AA" fill="none" strokeWidth={2} strokeDasharray="4 4" />;
        })()}
        {pending?.to && (() => {
          const n = nodes.find(nn => nn.id === pending.to!.nodeId);
          if (!n) return null;
          const end = getInputCoord(n, pending.to.portId);
          const path = cubicPath(cursorPos, end);
          return <path d={path} stroke="#3b82f6AA" fill="none" strokeWidth={2} strokeDasharray="4 4" />;
        })()}
      </svg>
  {nodes.map(node => (
        <div key={node.id} className={"graph-node" + (node.id === selectedNodeId ? ' selected' : '')} style={{ left: node.x, top: node.y }} onMouseDown={e => startDrag(e, node)}>
          <div className="node-header" onDoubleClick={() => onSelectNode(node.id)}>{node.title}</div>
          <div className="ports">
            <div className="inputs">
              {node.inputs.map((p, idx) => (
                <div key={p.id} className="port-row" style={{ top: 34 + idx * 22 }}>
                  <div
                    className="port in"
                    onMouseDown={e => startConnection(e, node.id, p.id, 'in')}
                    onMouseUp={e => finishConnection(e, node.id, p.id, 'in')}
                    onMouseEnter={() => setHoverPort({ nodeId: node.id, portId: p.id, dir: 'in' })}
                    onMouseLeave={() => setHoverPort(h => h && h.portId === p.id ? null : h)}
                    title={p.label}
                  />
                  <span className="port-label in">{p.label}</span>
                </div>
              ))}
            </div>
            <div className="outputs">
              {node.outputs.map((p, idx) => (
                <div key={p.id} className="port-row" style={{ top: 34 + idx * 22 }}>
                  <span className="port-label out">{p.label}</span>
                  <div
                    className="port out"
                    onMouseDown={e => startConnection(e, node.id, p.id, 'out')}
                    onMouseUp={e => finishConnection(e, node.id, p.id, 'out')}
                    onMouseEnter={() => setHoverPort({ nodeId: node.id, portId: p.id, dir: 'out' })}
                    onMouseLeave={() => setHoverPort(h => h && h.portId === p.id ? null : h)}
                    title={p.label}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
  ))}
  </div>
    </div>
  );
};
