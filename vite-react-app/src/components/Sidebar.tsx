import React from 'react';
interface SidebarNodeLite { id: string; title: string; }
interface SidebarProps {
  nodes: SidebarNodeLite[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ nodes, activeId, onSelect, onAdd, onDelete }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Nodes</h1>
        <button className="primary" onClick={onAdd}>+</button>
      </div>
      <ul className="node-list">
        {nodes.map(n => (
          <li key={n.id} className={n.id === activeId ? 'active' : ''}>
            <button className="node-btn" onClick={() => onSelect(n.id)}>{n.title || 'Bez tytułu'}</button>
            <button className="del-btn" onClick={() => onDelete(n.id)} title="Usuń">×</button>
          </li>
        ))}
      </ul>
    </aside>
  );
};
