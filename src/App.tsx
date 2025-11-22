import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, useGLTF } from '@react-three/drei';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  FolderOpen, 
  Grid3x3, 
  X, 
  Upload,
  Layers,
  Box,
  AlertCircle,
  MoveHorizontal,
  Settings,
  Palette
} from 'lucide-react';

// ============================================================
// 🎯 Type Definitions
// ============================================================
interface Tool {
  id: string;
  name: string;
  groupId: string;
  modelUrl?: string;
  imageUrl?: string;
  description?: string;
  specs?: Record<string, string>;
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  toolId: string;
}

// ============================================================
// 📦 Mock Data
// ============================================================
const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: '钻头工具', color: '#f97316' },
  { id: 'g2', name: '套管工具', color: '#3b82f6' },
  { id: 'g3', name: '测量仪器', color: '#10b981' },
];

const MOCK_TOOLS: Tool[] = [
  {
    id: 't1',
    name: 'PDC 钻头 8.5"',
    groupId: 'g1',
    imageUrl: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400',
    description: '高效聚晶金刚石复合片钻头，适用于中硬地层',
    specs: {
      '直径': '8.5 英寸',
      '最大转速': '180 RPM',
      '工作压力': '15000 PSI',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    name: '三牙轮钻头',
    groupId: 'g1',
    imageUrl: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400',
    description: '经典三牙轮设计，适应性强',
    specs: {
      '直径': '12.25 英寸',
      '牙轮数': '3',
      '适用地层': '软-中硬',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    name: '声波测井仪',
    groupId: 'g3',
    imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
    description: '高精度声波测井，实时地层分析',
    specs: {
      '测量范围': '0-10000 米',
      '精度': '±0.5%',
      '耐温': '150°C',
    },
    createdAt: new Date().toISOString(),
  },
];

const COLOR_OPTIONS = [
  '#f97316', '#3b82f6', '#10b981', '#8b5cf6', 
  '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'
];

// ============================================================
// 🔧 Data Service Layer (Dual-Mode Architecture)
// ============================================================
class DataService {
  private mode: 'mock' | 'supabase';
  private supabase: SupabaseClient | null = null;
  private mockTools: Tool[] = [];
  private mockGroups: Group[] = [];

constructor() {
    const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

    // --- 新增这段调试代码 ---
    console.log('🔍 环境变量检查:', {
      hasUrl: !!supabaseUrl,
      urlValue: supabaseUrl, // 看看这里打印出来是什么
      hasKey: !!supabaseKey
    });
    // -----------------------

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
      this.mode = 'supabase';
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ 数据服务：Supabase 实时模式');
    } else {
      this.mode = 'mock';
      const savedTools = localStorage.getItem('fracturing_tools');
      const savedGroups = localStorage.getItem('fracturing_groups');
      this.mockTools = savedTools ? JSON.parse(savedTools) : [...MOCK_TOOLS];
      this.mockGroups = savedGroups ? JSON.parse(savedGroups) : [...MOCK_GROUPS];
      console.log('⚠️ 数据服务：演示模式（本地存储）');
    }
  }

    if (supabaseUrl && supabaseKey && supabaseUrl !== 'YOUR_SUPABASE_URL') {
      this.mode = 'supabase';
      this.supabase = createClient(supabaseUrl, supabaseKey);
      console.log('✅ 数据服务：Supabase 实时模式');
    } else {
      this.mode = 'mock';
      const savedTools = localStorage.getItem('fracturing_tools');
      const savedGroups = localStorage.getItem('fracturing_groups');
      this.mockTools = savedTools ? JSON.parse(savedTools) : [...MOCK_TOOLS];
      this.mockGroups = savedGroups ? JSON.parse(savedGroups) : [...MOCK_GROUPS];
      console.log('⚠️ 数据服务：演示模式（本地存储）');
    }
  }

  async fetchTools(): Promise<Tool[]> {
    if (this.mode === 'supabase' && this.supabase) {
      const { data, error } = await this.supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(d => ({
        id: d.id,
        name: d.name,
        groupId: d.group_id,
        modelUrl: d.model_url,
        imageUrl: d.image_url,
        description: d.description,
        specs: d.specs,
        createdAt: d.created_at,
      }));
    }
    return [...this.mockTools];
  }

  async fetchGroups(): Promise<Group[]> {
    if (this.mode === 'supabase' && this.supabase) {
      const { data, error } = await this.supabase
        .from('groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data.map(d => ({ id: d.id, name: d.name, color: d.color }));
    }
    return [...this.mockGroups];
  }

  async addTool(tool: Omit<Tool, 'id' | 'createdAt'>): Promise<Tool> {
    if (this.mode === 'supabase' && this.supabase) {
      const { data, error } = await this.supabase
        .from('tools')
        .insert({
          name: tool.name,
          group_id: tool.groupId,
          model_url: tool.modelUrl,
          image_url: tool.imageUrl,
          description: tool.description,
          specs: tool.specs,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        groupId: data.group_id,
        modelUrl: data.model_url,
        imageUrl: data.image_url,
        description: data.description,
        specs: data.specs,
        createdAt: data.created_at,
      };
    }
    const newTool: Tool = {
      id: `t${Date.now()}`,
      ...tool,
      createdAt: new Date().toISOString(),
    };
    this.mockTools.unshift(newTool);
    localStorage.setItem('fracturing_tools', JSON.stringify(this.mockTools));
    return newTool;
  }

  async deleteTool(id: string): Promise<void> {
    if (this.mode === 'supabase' && this.supabase) {
      const { error } = await this.supabase.from('tools').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    this.mockTools = this.mockTools.filter(t => t.id !== id);
    localStorage.setItem('fracturing_tools', JSON.stringify(this.mockTools));
  }

  async updateTool(id: string, updates: Partial<Tool>): Promise<void> {
    if (this.mode === 'supabase' && this.supabase) {
      const { error } = await this.supabase
        .from('tools')
        .update({
          name: updates.name,
          group_id: updates.groupId,
          model_url: updates.modelUrl,
          image_url: updates.imageUrl,
          description: updates.description,
          specs: updates.specs,
        })
        .eq('id', id);
      if (error) throw error;
      return;
    }
    const index = this.mockTools.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTools[index] = { ...this.mockTools[index], ...updates };
      localStorage.setItem('fracturing_tools', JSON.stringify(this.mockTools));
    }
  }

  async addGroup(group: Omit<Group, 'id'>): Promise<Group> {
    if (this.mode === 'supabase' && this.supabase) {
      const { data, error } = await this.supabase
        .from('groups')
        .insert({ name: group.name, color: group.color })
        .select()
        .single();
      if (error) throw error;
      return { id: data.id, name: data.name, color: data.color };
    }
    const newGroup: Group = {
      id: `g${Date.now()}`,
      ...group,
    };
    this.mockGroups.push(newGroup);
    localStorage.setItem('fracturing_groups', JSON.stringify(this.mockGroups));
    return newGroup;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    if (this.mode === 'supabase' && this.supabase) {
      const { error } = await this.supabase
        .from('groups')
        .update({ name: updates.name, color: updates.color })
        .eq('id', id);
      if (error) throw error;
      return;
    }
    const index = this.mockGroups.findIndex(g => g.id === id);
    if (index !== -1) {
      this.mockGroups[index] = { ...this.mockGroups[index], ...updates };
      localStorage.setItem('fracturing_groups', JSON.stringify(this.mockGroups));
    }
  }

  async deleteGroup(id: string): Promise<void> {
    if (this.mode === 'supabase' && this.supabase) {
      const { error } = await this.supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    this.mockGroups = this.mockGroups.filter(g => g.id !== id);
    localStorage.setItem('fracturing_groups', JSON.stringify(this.mockGroups));
  }

  getMode() {
    return this.mode;
  }
}

const dataService = new DataService();

// ============================================================
// 🎨 3D Viewer Component
// ============================================================
const Model = React.memo(({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
});

const Viewer3D = React.memo(({ modelUrl }: { modelUrl: string }) => {
  return (
    <div className="w-full h-full bg-gray-100">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.4} />
          
          <Center>
            <Model url={modelUrl} />
          </Center>
          
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05}
            minDistance={2}
            maxDistance={10}
          />
        </Suspense>
      </Canvas>
      <div className="absolute bottom-4 left-4 text-gray-600 text-sm bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">
        拖拽旋转 · 滚轮缩放
      </div>
    </div>
  );
});

// ============================================================
// 🖼️ 2D Image Viewer
// ============================================================
function Viewer2D({ imageUrl }: { imageUrl: string }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
      className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden cursor-move"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img 
        src={imageUrl} 
        alt="工具图片"
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging.current ? 'none' : 'transform 0.1s',
        }}
        draggable={false}
      />
      <div className="absolute bottom-4 left-4 text-gray-600 text-sm bg-white/90 px-3 py-1.5 rounded-lg shadow-sm">
        拖拽移动 · 滚轮缩放
      </div>
    </div>
  );
}

// ============================================================
// 📁 Sidebar Component
// ============================================================
function Sidebar({ 
  groups, 
  selectedGroup, 
  onSelectGroup,
  onManageGroups
}: { 
  groups: Group[]; 
  selectedGroup: string | null; 
  onSelectGroup: (id: string | null) => void;
  onManageGroups: () => void;
}) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-gray-800">
          <Layers className="w-5 h-5" />
          工具分组
        </h2>
        <button
          onClick={onManageGroups}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="管理分组"
        >
          <Settings className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => onSelectGroup(null)}
          className={`w-full text-left px-4 py-2.5 rounded-lg mb-1 transition-colors ${
            selectedGroup === null 
              ? 'bg-orange-500 text-white' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            全部工具
          </div>
        </button>
        
        {groups.map(group => (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group.id)}
            className={`w-full text-left px-4 py-2.5 rounded-lg mb-1 transition-colors ${
              selectedGroup === group.id 
                ? 'bg-orange-500 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: group.color }}
              />
              {group.name}
            </div>
          </button>
        ))}
      </div>

      {dataService.getMode() === 'mock' && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>演示模式：数据存储在浏览器本地</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 🃏 Tool Card Component
// ============================================================
function ToolCard({ 
  tool, 
  groupColor, 
  onClick,
  onContextMenu 
}: { 
  tool: Tool; 
  groupColor: string;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className="bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-gray-200"
    >
      <div className="aspect-video bg-gray-50 relative overflow-hidden">
        {tool.imageUrl ? (
          <img 
            src={tool.imageUrl} 
            alt={tool.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Box className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full shadow-md"
          style={{ backgroundColor: groupColor }}
        />
      </div>
      
      <div className="p-4">
        <h3 className="text-gray-900 mb-1">{tool.name}</h3>
        {tool.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{tool.description}</p>
        )}
        {tool.specs && Object.keys(tool.specs).length > 0 && (
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            {Object.entries(tool.specs).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}</span>
                <span className="text-gray-700">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 🎯 Context Menu
// ============================================================
function ContextMenu({ 
  position, 
  onEdit, 
  onMove, 
  onDelete, 
  onClose 
}: {
  position: { x: number; y: number };
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onEdit}
        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        <Edit3 className="w-4 h-4" />
        重命名
      </button>
      <button
        onClick={onMove}
        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        <MoveHorizontal className="w-4 h-4" />
        移动分组
      </button>
      <div className="border-t border-gray-200 my-1" />
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        删除
      </button>
    </div>
  );
}

// ============================================================
// 📋 Grid View Component
// ============================================================
function GridView({ 
  tools, 
  groups,
  onToolClick,
  onContextMenu 
}: { 
  tools: Tool[];
  groups: Group[];
  onToolClick: (tool: Tool) => void;
  onContextMenu: (e: React.MouseEvent, toolId: string) => void;
}) {
  if (tools.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-gray-600">暂无工具数据</p>
          <p className="text-sm mt-2">点击右上角按钮开始录入</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map(tool => {
          const group = groups.find(g => g.id === tool.groupId);
          return (
            <ToolCard
              key={tool.id}
              tool={tool}
              groupColor={group?.color || '#6b7280'}
              onClick={() => onToolClick(tool)}
              onContextMenu={(e) => onContextMenu(e, tool.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 📝 Group Management Modal
// ============================================================
function GroupManagementModal({
  groups,
  onClose,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup
}: {
  groups: Group[];
  onClose: () => void;
  onAddGroup: (group: Omit<Group, 'id'>) => void;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(COLOR_OPTIONS[0]);

  const handleEdit = (group: Group) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateGroup(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
    }
  };

  const handleAddNew = () => {
    if (newGroupName.trim()) {
      onAddGroup({ name: newGroupName.trim(), color: newGroupColor });
      setNewGroupName('');
      setNewGroupColor(COLOR_OPTIONS[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            管理分组
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          <div className="space-y-2 mb-6">
            {groups.map(group => (
              <div key={group.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                {editingId === group.id ? (
                  <>
                    <input
                      type="text"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-12 h-8 rounded cursor-pointer"
                      style={{ backgroundColor: editColor }}
                      title="点击选择颜色"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className="w-6 h-6 rounded border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="flex-1 text-gray-900">{group.name}</span>
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除分组"${group.name}"吗？`)) {
                          onDeleteGroup(group.id);
                        }
                      }}
                      className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm text-gray-700 mb-3">添加新分组</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-8 h-8 rounded border-2 ${
                        newGroupColor === color ? 'border-gray-900' : 'border-white'
                      } shadow-sm`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNew()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="分组名称"
                />
                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 📝 Upload Modal Component
// ============================================================
function UploadModal({ 
  groups, 
  onClose, 
  onSubmit 
}: { 
  groups: Group[];
  onClose: () => void;
  onSubmit: (tool: Omit<Tool, 'id' | 'createdAt'>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    groupId: groups[0]?.id || '',
    modelUrl: '',
    imageUrl: '',
    description: '',
    specs: {} as Record<string, string>,
  });

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');

  const handleAddSpec = () => {
    if (specKey && specValue) {
      setFormData(prev => ({
        ...prev,
        specs: { ...prev.specs, [specKey]: specValue },
      }));
      setSpecKey('');
      setSpecValue('');
    }
  };

  const handleRemoveSpec = (key: string) => {
    setFormData(prev => {
      const newSpecs = { ...prev.specs };
      delete newSpecs[key];
      return { ...prev, specs: newSpecs };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.groupId) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-xl text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            录入工具
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">工具名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="例如：PDC 钻头 8.5 英寸"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">所属分组 *</label>
            <select
              required
              value={formData.groupId}
              onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">3D 模型 URL</label>
            <input
              type="url"
              value={formData.modelUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, modelUrl: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://example.com/model.glb"
            />
            <p className="text-xs text-gray-500 mt-1">支持 .glb / .gltf 格式</p>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">预览图片 URL</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">工具描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={3}
              placeholder="简要描述工具的特性和用途"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">技术参数</label>
            <div className="space-y-2">
              {Object.entries(formData.specs).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <span className="text-gray-900 flex-1">{key}: {value}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(key)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="参数名"
                />
                <input
                  type="text"
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="参数值"
                />
                <button
                  type="button"
                  onClick={handleAddSpec}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              提交
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// 🔍 Detail View Modal
// ============================================================
function DetailView({ 
  tool, 
  group,
  onClose 
}: { 
  tool: Tool;
  group: Group | undefined;
  onClose: () => void;
}) {
  const hasModel = tool.modelUrl && tool.modelUrl.trim() !== '';
  const hasImage = tool.imageUrl && tool.imageUrl.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: group?.color || '#6b7280' }}
          />
          <h2 className="text-xl text-gray-900">{tool.name}</h2>
          <span className="text-sm text-gray-500">/ {group?.name}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {hasModel ? (
            <Viewer3D modelUrl={tool.modelUrl!} />
          ) : hasImage ? (
            <Viewer2D imageUrl={tool.imageUrl!} />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Box className="w-24 h-24 mx-auto mb-4 opacity-30" />
                <p>暂无可视化资源</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-6">
          {tool.description && (
            <div className="mb-6">
              <h3 className="text-sm text-gray-500 mb-2">工具描述</h3>
              <p className="text-gray-900">{tool.description}</p>
            </div>
          )}

          {tool.specs && Object.keys(tool.specs).length > 0 && (
            <div>
              <h3 className="text-sm text-gray-500 mb-3">技术参数</h3>
              <div className="space-y-2">
                {Object.entries(tool.specs).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="flex justify-between items-center py-2 border-b border-gray-100"
                  >
                    <span className="text-gray-600 text-sm">{key}</span>
                    <span className="text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              录入时间：{new Date(tool.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🚀 Main App Component
// ============================================================
export default function App() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [toolsData, groupsData] = await Promise.all([
        dataService.fetchTools(),
        dataService.fetchGroups(),
      ]);
      setTools(toolsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = selectedGroup
    ? tools.filter(t => t.groupId === selectedGroup)
    : tools;

  const handleAddTool = async (toolData: Omit<Tool, 'id' | 'createdAt'>) => {
    try {
      const newTool = await dataService.addTool(toolData);
      setTools(prev => [newTool, ...prev]);
      setShowUploadModal(false);
    } catch (error) {
      console.error('添加工具失败:', error);
      alert('添加失败，请重试');
    }
  };

  const handleDeleteTool = async (id: string) => {
    if (!confirm('确定要删除这个工具吗？')) return;
    try {
      await dataService.deleteTool(id);
      setTools(prev => prev.filter(t => t.id !== id));
      setContextMenu(null);
    } catch (error) {
      console.error('删除工具失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleAddGroup = async (groupData: Omit<Group, 'id'>) => {
    try {
      const newGroup = await dataService.addGroup(groupData);
      setGroups(prev => [...prev, newGroup]);
    } catch (error) {
      console.error('添加分组失败:', error);
      alert('添加失败，请重试');
    }
  };

  const handleUpdateGroup = async (id: string, updates: Partial<Group>) => {
    try {
      await dataService.updateGroup(id, updates);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    } catch (error) {
      console.error('更新分组失败:', error);
      alert('更新失败，请重试');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await dataService.deleteGroup(id);
      setGroups(prev => prev.filter(g => g.id !== id));
      if (selectedGroup === id) {
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('删除分组失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, toolId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, toolId });
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl text-gray-900">压裂工具展示系统</h1>
            <p className="text-xs text-gray-500">FracTools Management Platform</p>
          </div>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          录入工具
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          onManageGroups={() => setShowGroupManagement(true)}
        />
        <GridView 
          tools={filteredTools}
          groups={groups}
          onToolClick={setSelectedTool}
          onContextMenu={handleContextMenu}
        />
      </div>

      {showUploadModal && (
        <UploadModal
          groups={groups}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleAddTool}
        />
      )}

      {showGroupManagement && (
        <GroupManagementModal
          groups={groups}
          onClose={() => setShowGroupManagement(false)}
          onAddGroup={handleAddGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
        />
      )}

      {selectedTool && (
        <DetailView
          tool={selectedTool}
          group={groups.find(g => g.id === selectedTool.groupId)}
          onClose={() => setSelectedTool(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onEdit={() => {
            const tool = tools.find(t => t.id === contextMenu.toolId);
            if (tool) {
              const newName = prompt('输入新名称:', tool.name);
              if (newName && newName.trim()) {
                dataService.updateTool(tool.id, { name: newName.trim() });
                setTools(prev => prev.map(t => 
                  t.id === tool.id ? { ...t, name: newName.trim() } : t
                ));
              }
            }
            setContextMenu(null);
          }}
          onMove={() => {
            const tool = tools.find(t => t.id === contextMenu.toolId);
            if (tool) {
              const groupNames = groups.map(g => g.name).join('\n');
              const newGroupName = prompt(`选择新分组:\n${groupNames}`, '');
              const newGroup = groups.find(g => g.name === newGroupName);
              if (newGroup) {
                dataService.updateTool(tool.id, { groupId: newGroup.id });
                setTools(prev => prev.map(t => 
                  t.id === tool.id ? { ...t, groupId: newGroup.id } : t
                ));
              }
            }
            setContextMenu(null);
          }}
          onDelete={() => handleDeleteTool(contextMenu.toolId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
