import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { GraphNode, Connection, PendingConnection, NodePort } from './types';
import { GraphCanvas } from './components/GraphCanvas';
import { MapPreview3D } from './components/MapPreview3D';
import { Inspector } from './components/Inspector';

const makePort = (label: string): NodePort => ({ id: crypto.randomUUID(), label });

const initialGraph: GraphNode[] = [
  { id: 'n1', title: 'Noise', x: 160, y: 120, inputs: [], outputs: [makePort('height')], nodeType: 'noise', params: { scale: 1.5, amplitude: 1 } },
  { id: 'n2', title: 'Noise 2', x: 460, y: 240, inputs: [], outputs: [makePort('height')], nodeType: 'noise', params: { scale: 2.5, amplitude: 0.5 } },
  { id: 'n3', title: 'Output', x: 760, y: 180, inputs: [makePort('h')], outputs: [], nodeType: 'output', params: {} },
];

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>(initialGraph);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<PendingConnection | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  const addNode = useCallback(() => {
    const id = crypto.randomUUID();
    const newNode: GraphNode = {
      id,
      title: 'Noise',
      x: 320,
      y: 160,
      inputs: [],
      outputs: [makePort('height')],
      nodeType: 'noise',
      params: { scale: 1.8, amplitude: 1 }
    };
    setNodes(ns => [...ns, newNode]);
    setSelectedNodeId(id);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(ns => ns.filter(n => n.id !== id));
    setConnections(cs => cs.filter(c => c.from.nodeId !== id && c.to.nodeId !== id));
    setSelectedNodeId(prev => prev === id ? '' : prev);
  }, []);

  const updateNodePos = useCallback((id: string, x: number, y: number) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, x, y } : n));
  }, []);

  const completeConnection = useCallback((from: Connection['from'], to: Connection['to']) => {
    // unikaj duplikatów
    setConnections(cs => {
      if (cs.some(c => c.from.nodeId === from.nodeId && c.from.portId === from.portId && c.to.nodeId === to.nodeId && c.to.portId === to.portId)) {
        return cs;
      }
      return [...cs, { id: crypto.randomUUID(), from, to }];
    });
  }, []);

  const startConnectionFromOutput = useCallback((nodeId: string, portId: string) => {
    setPending({ from: { nodeId, portId } });
  }, []);

  const startConnectionFromInput = useCallback((nodeId: string, portId: string) => {
    setPending({ to: { nodeId, portId } });
  }, []);

  const attemptConnectionToInput = useCallback((nodeId: string, portId: string) => {
    setPending(p => {
      if (p?.from) {
        completeConnection(p.from, { nodeId, portId });
        return null;
      }
      return p; // jeśli zaczęliśmy od inputu ignoruj
    });
  }, [completeConnection]);

  const attemptConnectionToOutput = useCallback((nodeId: string, portId: string) => {
    setPending(p => {
      if (p?.to) {
        completeConnection({ nodeId, portId }, p.to);
        return null;
      }
      return p;
    });
  }, [completeConnection]);

  const cancelPending = useCallback(() => setPending(null), []);

  const removeConnection = useCallback((id: string) => {
    setConnections(cs => cs.filter(c => c.id !== id));
  }, []);

  return (
    <div className="layout-root">
      <Sidebar
        nodes={nodes.map(n => ({ id: n.id, title: n.title }))}
        activeId={selectedNodeId}
        onSelect={setSelectedNodeId}
        onAdd={addNode}
        onDelete={deleteNode}
      />
      <main className="editor-pane">
        <div className="canvas-wrapper">
          <GraphCanvas
            nodes={nodes}
            connections={connections}
            pending={pending}
            onNodePositionChange={updateNodePos}
            onStartFromOutput={startConnectionFromOutput}
            onStartFromInput={startConnectionFromInput}
            onConnectToInput={attemptConnectionToInput}
            onConnectToOutput={attemptConnectionToOutput}
            onCancelPending={cancelPending}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            onRemoveConnection={removeConnection}
          />
        </div>
        <aside className="right-pane">
          <MapPreview3D nodes={nodes} connections={connections} />
          <Inspector selectedNode={nodes.find(n => n.id === selectedNodeId)} connections={connections} />
        </aside>
      </main>
    </div>
  );
};
