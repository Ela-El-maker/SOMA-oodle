import type { KnowledgeNode, KnowledgeEdge } from '../types';

function now() { return Date.now(); }
function uid(prefix = '') { return `${prefix}${crypto.randomUUID()}`; }

export class KnowledgeMesh {
  public nodes: Map<string, KnowledgeNode>;
  public edges: KnowledgeEdge[];
  private urlIndex: Map<string, string>;

  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.urlIndex = new Map();
  }

  static canonicalizeUrl(url = ''): string {
    try {
      const u = new URL(url);
      let p = u.href;
      if (p.endsWith('/')) p = p.slice(0, -1);
      return p.toLowerCase();
    } catch (e) {
      return (url || '').toLowerCase().trim();
    }
  }

  addNode(node: Partial<KnowledgeNode>): string {
    const id = node.id || uid('node_');
    const canonical = node.url ? KnowledgeMesh.canonicalizeUrl(node.url) : null;

    if (canonical && this.urlIndex.has(canonical)) {
      const existingId = this.urlIndex.get(canonical)!;
      const existing = this.nodes.get(existingId)!;
      existing.summary = existing.summary && node.summary ? `${existing.summary}\n\n${node.summary}` : (node.summary || existing.summary);
      existing.ts = Math.max(existing.ts || 0, node.ts || now());
      existing.weight = (existing.weight || 1) + (node.weight || 1);
      this.nodes.set(existingId, existing);
      return existingId;
    }
    
    const newNode: KnowledgeNode = {
      id,
      title: node.title || node.url || 'Untitled',
      summary: node.summary || '',
      url: node.url || null,
      ts: node.ts || now(),
      weight: node.weight || 1,
    };

    this.nodes.set(id, newNode);
    if (newNode.url) {
      const c = KnowledgeMesh.canonicalizeUrl(newNode.url);
      this.urlIndex.set(c, id);
    }
    return id;
  }
  
  getNodeByUrl(url: string): KnowledgeNode | undefined {
      const canonical = KnowledgeMesh.canonicalizeUrl(url);
      const nodeId = this.urlIndex.get(canonical);
      return nodeId ? this.nodes.get(nodeId) : undefined;
  }

  addEdge(edge: Omit<KnowledgeEdge, 'id'>): string {
    const id = uid('edge_');
    if (edge && edge.from && edge.to) {
      this.edges.push({ id, ...edge });
      return id;
    }
    return '';
  }

  summarize(limitNodes = 10) {
    const arr = Array.from(this.nodes.values());
    arr.sort((a, b) => (b.weight || 0) - (a.weight || 0) || (b.ts || 0) - (a.ts || 0));
    // FIX: Add 'summary' to the returned object to make it available for consumers.
    const top = arr.slice(0, limitNodes).map(n => ({ id: n.id, title: n.title, url: n.url, weight: n.weight, summary: n.summary }));
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      topNodes: top
    };
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }
  
  static fromJSON(data: any): KnowledgeMesh {
      const mesh = new KnowledgeMesh();
      if (data && data.nodes) {
          for (const node of data.nodes) {
              mesh.nodes.set(node.id, node);
              if (node.url) {
                  const canonical = KnowledgeMesh.canonicalizeUrl(node.url);
                  mesh.urlIndex.set(canonical, node.id);
              }
          }
      }
      if (data && data.edges) {
          mesh.edges = data.edges;
      }
      return mesh;
  }
}