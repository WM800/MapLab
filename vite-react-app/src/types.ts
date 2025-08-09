export interface NodePort {
  id: string;
  label: string;
}

export type TerrainNodeType = 'noise' | 'add' | 'multiply' | 'clamp' | 'output';

export interface NodeParamsBase { [k: string]: number; }

export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  inputs: NodePort[];
  outputs: NodePort[];
  nodeType: TerrainNodeType;
  params: NodeParamsBase;
}

export interface ConnectionEnd {
  nodeId: string;
  portId: string;
}

export interface Connection {
  id: string;
  from: ConnectionEnd; // output
  to: ConnectionEnd;   // input
}

export interface PendingConnection {
  from?: ConnectionEnd; // kiedy wybraliśmy output
  to?: ConnectionEnd;   // (opcjonalnie jeśli start od inputu)
}
