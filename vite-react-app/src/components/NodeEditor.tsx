import React, { useCallback } from 'react';
import { NodeData } from '../types';

interface NodeEditorProps {
  node: NodeData;
  onChange: (id: string, patch: Partial<NodeData>) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, onChange }) => {
  const updateField = useCallback(<K extends keyof NodeData>(key: K, value: NodeData[K]) => {
    onChange(node.id, { [key]: value } as Partial<NodeData>);
  }, [node.id, onChange]);

  return (
    <div className="node-editor">
      <input
        className="title-input"
        value={node.title}
        placeholder="Tytuł"
        onChange={e => updateField('title', e.target.value)}
      />
      <textarea
        className="content-input"
        value={node.content}
        placeholder="Treść..."
        onChange={e => updateField('content', e.target.value)}
      />
    </div>
  );
};
