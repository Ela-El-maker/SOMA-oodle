
// FIX: Export FSNode so it can be used as a type in other files.
export interface FSNode {
  name: string;
  type: 'file' | 'directory';
}

export class File implements FSNode {
  type: 'file' = 'file';
  content: string;
  constructor(public name: string, content = '') {
    this.content = content;
  }
}

export class Directory implements FSNode {
  type: 'directory' = 'directory';
  children: Map<string, FSNode> = new Map();
  parent: Directory | null;
  constructor(public name: string, parent: Directory | null = null) {
    this.parent = parent;
  }
}

export class FileSystemService {
  private root: Directory;
  private currentDirectory: Directory;
  public isReady: boolean = false;

  constructor() {
    this.root = new Directory('/');
    this.currentDirectory = this.root;
    this.load();
  }
  
  public reset() {
    this.root = new Directory('/');
    this.currentDirectory = this.root;
    localStorage.removeItem('somaFileSystem');
  }

  private save() {
    if (!this.isReady) return;
    const serialize = (dir: Directory): object => {
      return {
        name: dir.name,
        type: 'directory',
        children: Array.from(dir.children.values()).map(node => {
          if (node.type === 'directory') {
            return serialize(node as Directory);
          }
          return { name: node.name, type: 'file', content: (node as File).content };
        })
      };
    };
    localStorage.setItem('somaFileSystem', JSON.stringify(serialize(this.root)));
  }

  private load() {
    const savedFS = localStorage.getItem('somaFileSystem');
    if (savedFS) {
      try {
        const parsed = JSON.parse(savedFS);
        const deserialize = (data: any, parent: Directory | null): Directory => {
          const dir = new Directory(data.name, parent);
          data.children?.forEach((childData: any) => {
            if (childData.type === 'directory') {
              dir.children.set(childData.name, deserialize(childData, dir));
            } else {
              dir.children.set(childData.name, new File(childData.name, childData.content));
            }
          });
          return dir;
        };
        this.root = deserialize(parsed, null);
        this.currentDirectory = this.root;
      } catch (e) {
        console.error("Failed to load file system from localStorage", e);
        this.root = new Directory('/');
        this.currentDirectory = this.root;
      }
    }
  }

  public getCurrentPath(): string {
    if (!this.isReady) return '~';
    if (this.currentDirectory === this.root) return '/';
    const path: string[] = [];
    let dir: Directory | null = this.currentDirectory;
    while (dir && dir !== this.root) {
      path.unshift(dir.name);
      dir = dir.parent;
    }
    return '/' + path.join('/');
  }

  public ls(path?: string): string {
    const dirNode = path ? this.getNode(path) : this.currentDirectory;
    if (!dirNode || dirNode.type !== 'directory') {
      return `ls: cannot access '${path}': No such file or directory`;
    }
    const dir = dirNode as Directory;
    const children = Array.from(dir.children.values());
    if (children.length === 0) return '';
    return children.map(c => c.type === 'directory' ? `${c.name}/` : c.name).join('\n');
  }

  public mkdir(path: string): string {
     if (typeof path !== 'string' || !path.trim()) return 'mkdir: missing operand';
     const { parent, name } = this.getParentAndName(path);
     if (!parent) return `mkdir: cannot create directory ‘${path}’: No such file or directory`;
     if (parent.children.has(name)) return `mkdir: cannot create directory ‘${name}’: File exists`;
     parent.children.set(name, new Directory(name, parent));
     this.save();
     return '';
  }
  
  public cat(path: string): string {
      if (typeof path !== 'string' || !path.trim()) return 'cat: missing operand';
      const node = this.getNode(path);
      if (!node) return `cat: ${path}: No such file or directory`;
      if (node.type === 'directory') return `cat: ${path}: Is a directory`;
      return (node as File).content;
  }

  public write(path: string, content: string): string {
      if (typeof path !== 'string' || !path.trim()) return 'write: missing path operand';
      const { parent, name } = this.getParentAndName(path);
      if (!parent || !name) return `write: cannot write to ‘${path}’: No such file or directory`;
      
      const file = new File(name, content);
      parent.children.set(name, file);
      this.save();
      return '';
  }

  public cd(path: string): string {
      if (typeof path !== 'string' || !path.trim()) return 'cd: missing operand';
      if (path === '..') {
          if (this.currentDirectory.parent) {
              this.currentDirectory = this.currentDirectory.parent;
          }
          return '';
      }
      const node = this.getNode(path);
      if (!node) return `cd: ${path}: No such file or directory`;
      if (node.type !== 'directory') return `cd: ${path}: Not a directory`;
      this.currentDirectory = node as Directory;
      return '';
  }

  public getNode(path: string): FSNode | undefined {
      if (!this.isReady) return undefined;
      if (typeof path !== 'string') return undefined; // Guard against non-string paths
      if (!path) return this.currentDirectory;
      
      const parts = path.split('/').filter(p => p);
      let currentNode: Directory = path.startsWith('/') ? this.root : this.currentDirectory;

      for (const part of parts) {
          if (part === '.') continue;
          if (part === '..') {
            currentNode = currentNode.parent || currentNode;
            continue;
          }
          const nextNode = currentNode.children.get(part);
          if (!nextNode) return undefined;
          if (nextNode.type === 'file' && part !== parts[parts.length - 1]) {
             return undefined;
          }
          if (nextNode.type === 'directory') {
            currentNode = nextNode as Directory;
          } else {
            return nextNode;
          }
      }
      return currentNode;
  }
  
  public getParentAndName(path: string): { parent: Directory | undefined, name: string } {
      if (!this.isReady || typeof path !== 'string' || !path) return { parent: undefined, name: ''};
      const parts = path.split('/').filter(p => p);
      const name = parts.pop();
      if (!name) return { parent: undefined, name: ''};
      
      const parentPath = parts.join('/');
      let resolvedParentPath = path.startsWith('/') ? `/${parentPath}` : parentPath;
      if (parts.length === 0 && !path.startsWith('/')) {
        resolvedParentPath = '';
      }
      const parentNode = this.getNode(resolvedParentPath);
      
      if (!parentNode || parentNode.type !== 'directory') {
        return { parent: undefined, name };
      }
      
      return { parent: parentNode as Directory, name };
  }

  public autocomplete(partialPath: string): string[] {
    if (!this.isReady || typeof partialPath !== 'string') return [];

    const parts = partialPath.split('/');
    const partialName = parts.pop() || '';
    const dirPath = parts.join('/');

    let searchDir: Directory | undefined;
    if (dirPath === '' && !partialPath.includes('/')) {
        // Search in current directory
        searchDir = this.currentDirectory;
    } else {
        const resolvedDirNode = this.getNode(dirPath);
        if (resolvedDirNode && resolvedDirNode.type === 'directory') {
            searchDir = resolvedDirNode as Directory;
        } else {
            return []; // Invalid directory path
        }
    }

    const childrenNames = Array.from(searchDir.children.keys());
    const matches = childrenNames.filter(name => name.startsWith(partialName));

    if (matches.length === 0) return [];

    return matches.map(match => {
        const node = searchDir!.children.get(match)!;
        const completion = dirPath ? `${dirPath}/${match}` : match;
        return node.type === 'directory' ? `${completion}/` : completion;
    });
  }
}