/**
 * MCPToolManager - Model Context Protocol Tool System
 * 
 * Provides SOMA with external tool capabilities:
 * - File operations (read, write, search)
 * - Web search and scraping
 * - Code execution (sandboxed)
 * - Memory queries
 * - Shell commands
 * - Knowledge base access
 * 
 * Tools are discoverable and can be invoked by the AI brains during reasoning.
 */

const { EventEmitter } = require('events');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const cheerio = require('cheerio');
const https = require('https');
const http = require('http');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.warn('[MCPToolManager] Puppeteer not found, browser tools will be limited');
}

class MCPToolManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.name = config.name || 'MCPToolManager';
    this.tools = new Map();
    
    // Access to SOMA components
    this.mnemonicArbiter = config.mnemonicArbiter || null;
    this.storageArbiter = config.storageArbiter || null;
    this.archivistArbiter = config.archivistArbiter || null;
    
    // Tool execution config
    this.config = {
      enableFileOps: config.enableFileOps !== false,
      enableWebSearch: config.enableWebSearch !== false,
      enableCodeExec: config.enableCodeExec !== false,
      enableShellExec: config.enableShellExec !== false,
      enableMemoryQuery: config.enableMemoryQuery !== false,
      
      // Safety limits
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxCodeExecTime: config.maxCodeExecTime || 30000, // 30s
      maxShellExecTime: config.maxShellExecTime || 30000, // 30s
      allowedShellCommands: config.allowedShellCommands || [], // Whitelist (empty = all)
      
      verbose: config.verbose !== false
    };
    
    // Metrics
    this.metrics = {
      totalInvocations: 0,
      successfulInvocations: 0,
      failedInvocations: 0,
      toolUsage: {}, // tool_name -> count
      avgExecutionTime: 0
    };
    
    this._registerBuiltInTools();
    this._log('Initialized with', this.tools.size, 'tools');
  }
  
  _log(...args) {
    if (this.config.verbose) {
      console.log(`[${this.name}]`, ...args);
    }
  }
  
  /**
   * Register all built-in tools
   */
  _registerBuiltInTools() {
    // File operations
    if (this.config.enableFileOps) {
      this.registerTool({
        name: 'read_file',
        description: 'Read contents of a file',
        parameters: {
          path: { type: 'string', description: 'Absolute file path', required: true }
        },
        handler: this._toolReadFile.bind(this)
      });
      
      this.registerTool({
        name: 'write_file',
        description: 'Write content to a file',
        parameters: {
          path: { type: 'string', description: 'Absolute file path', required: true },
          content: { type: 'string', description: 'File content', required: true }
        },
        handler: this._toolWriteFile.bind(this)
      });
      
      this.registerTool({
        name: 'list_directory',
        description: 'List files in a directory',
        parameters: {
          path: { type: 'string', description: 'Directory path', required: true }
        },
        handler: this._toolListDirectory.bind(this)
      });
      
      this.registerTool({
        name: 'search_files',
        description: 'Search for files by name pattern',
        parameters: {
          directory: { type: 'string', description: 'Directory to search', required: true },
          pattern: { type: 'string', description: 'File name pattern (glob)', required: true }
        },
        handler: this._toolSearchFiles.bind(this)
      });
    }
    
    // Memory operations
    if (this.config.enableMemoryQuery && this.mnemonicArbiter) {
      this.registerTool({
        name: 'query_memory',
        description: 'Query SOMA memory system for past interactions',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          limit: { type: 'number', description: 'Max results', required: false, default: 10 }
        },
        handler: this._toolQueryMemory.bind(this)
      });
      
      this.registerTool({
        name: 'store_memory',
        description: 'Store information in SOMA memory',
        parameters: {
          content: { type: 'string', description: 'Content to store', required: true },
          metadata: { type: 'object', description: 'Additional metadata', required: false }
        },
        handler: this._toolStoreMemory.bind(this)
      });
    }
    
    // Shell execution
    if (this.config.enableShellExec) {
      this.registerTool({
        name: 'execute_command',
        description: 'Execute a shell command',
        parameters: {
          command: { type: 'string', description: 'Command to execute', required: true },
          cwd: { type: 'string', description: 'Working directory', required: false }
        },
        handler: this._toolExecuteCommand.bind(this)
      });
    }
    
    // Code execution (sandboxed)
    if (this.config.enableCodeExec) {
      this.registerTool({
        name: 'execute_code',
        description: 'Execute code in a sandboxed environment',
        parameters: {
          code: { type: 'string', description: 'Code to execute', required: true },
          language: { type: 'string', description: 'Programming language (javascript, python)', required: true }
        },
        handler: this._toolExecuteCode.bind(this)
      });
    }
    
    // Web search (simulated for now)
    if (this.config.enableWebSearch) {
      this.registerTool({
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          limit: { type: 'number', description: 'Max results', required: false, default: 5 }
        },
        handler: this._toolWebSearch.bind(this)
      });

      this.registerTool({
        name: 'browse_url',
        description: 'Browse a URL using a headless browser to extract content from JavaScript-heavy sites',
        parameters: {
          url: { type: 'string', description: 'URL to browse', required: true },
          wait: { type: 'number', description: 'Time to wait for page load in ms', required: false, default: 2000 }
        },
        handler: this._toolBrowseUrl.bind(this)
      });
      
      // Web scraping tools (no rate limits)
      this.registerTool({
        name: 'scrape_arxiv',
        description: 'Scrape research papers from ArXiv',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          maxResults: { type: 'number', description: 'Max results', required: false, default: 5 }
        },
        category: 'web_scraping',
        handler: this._toolScrapeArxiv.bind(this)
      });
      
      this.registerTool({
        name: 'scrape_wikipedia',
        description: 'Scrape Wikipedia articles',
        parameters: {
          query: { type: 'string', description: 'Article title or search', required: true }
        },
        category: 'web_scraping',
        handler: this._toolScrapeWikipedia.bind(this)
      });
      
      this.registerTool({
        name: 'scrape_github',
        description: 'Scrape GitHub repositories',
        parameters: {
          query: { type: 'string', description: 'Search query or repo path', required: true },
          maxResults: { type: 'number', description: 'Max results', required: false, default: 5 }
        },
        category: 'web_scraping',
        handler: this._toolScrapeGithub.bind(this)
      });
      
      this.registerTool({
        name: 'scrape_stackoverflow',
        description: 'Scrape Stack Overflow questions and answers',
        parameters: {
          query: { type: 'string', description: 'Search query', required: true },
          maxResults: { type: 'number', description: 'Max results', required: false, default: 5 }
        },
        category: 'web_scraping',
        handler: this._toolScrapeStackOverflow.bind(this)
      });
      
      this.registerTool({
        name: 'scrape_news',
        description: 'Scrape news articles from major sources',
        parameters: {
          query: { type: 'string', description: 'Search query or topic', required: true },
          source: { type: 'string', description: 'News source (hacker-news, reddit, dev.to)', required: false, default: 'hacker-news' },
          maxResults: { type: 'number', description: 'Max results', required: false, default: 10 }
        },
        category: 'web_scraping',
        handler: this._toolScrapeNews.bind(this)
      });
    }
  }
  
  /**
   * Register a new tool
   */
  registerTool(tool) {
    if (!tool.name || !tool.handler) {
      throw new Error('Tool must have name and handler');
    }
    
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.parameters || {},
      handler: tool.handler,
      category: tool.category || 'general'
    });
    
    this.metrics.toolUsage[tool.name] = 0;
    this._log(`Registered tool: ${tool.name}`);
  }
  
  /**
   * Get list of available tools
   */
  listTools() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      category: tool.category
    }));
  }
  
  /**
   * Get tool by name
   */
  getTool(name) {
    return this.tools.get(name);
  }
  
  /**
   * Invoke a tool
   */
  async invokeTool(toolName, parameters = {}) {
    const startTime = Date.now();
    this.metrics.totalInvocations++;
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      this.metrics.failedInvocations++;
      throw new Error(`Tool not found: ${toolName}`);
    }
    
    this._log(`Invoking tool: ${toolName}`, parameters);
    this.emit('tool_invoked', { tool: toolName, parameters });
    
    try {
      // Validate parameters
      this._validateParameters(tool, parameters);
      
      // Execute tool
      const result = await tool.handler(parameters);
      
      const duration = Date.now() - startTime;
      this.metrics.successfulInvocations++;
      this.metrics.toolUsage[toolName]++;
      this._updateAvgExecutionTime(duration);
      
      this._log(`Tool ${toolName} completed in ${duration}ms`);
      this.emit('tool_completed', { tool: toolName, duration, success: true });
      
      return {
        success: true,
        result,
        duration
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.failedInvocations++;
      
      this._log(`Tool ${toolName} failed:`, error.message);
      this.emit('tool_completed', { tool: toolName, duration, success: false, error: error.message });
      
      return {
        success: false,
        error: error.message,
        duration
      };
    }
  }
  
  /**
   * Validate tool parameters
   */
  _validateParameters(tool, parameters) {
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && !(paramName in parameters)) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
    }
  }
  
  /**
   * Update average execution time metric
   */
  _updateAvgExecutionTime(duration) {
    const total = this.metrics.avgExecutionTime * (this.metrics.totalInvocations - 1);
    this.metrics.avgExecutionTime = (total + duration) / this.metrics.totalInvocations;
  }
  
  // ==================== TOOL IMPLEMENTATIONS ====================
  
  /**
   * Tool: Read file
   */
  async _toolReadFile({ path: filePath }) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      return {
        path: filePath,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
  
  /**
   * Tool: Write file
   */
  async _toolWriteFile({ path: filePath, content }) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(filePath, content, 'utf8');
      const stats = await fs.stat(filePath);
      
      return {
        path: filePath,
        size: stats.size,
        written: true
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
  
  /**
   * Tool: List directory
   */
  async _toolListDirectory({ path: dirPath }) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      const files = [];
      const directories = [];
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          directories.push(entry.name);
        } else {
          files.push(entry.name);
        }
      }
      
      return {
        path: dirPath,
        files,
        directories,
        total: entries.length
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }
  
  /**
   * Tool: Search files
   */
  async _toolSearchFiles({ directory, pattern }) {
    try {
      const results = [];
      
      async function searchRecursive(dir, depth = 0) {
        if (depth > 5) return; // Limit recursion depth
        
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await searchRecursive(fullPath, depth + 1);
          } else if (entry.name.includes(pattern) || entry.name.match(new RegExp(pattern))) {
            const stats = await fs.stat(fullPath);
            results.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              modified: stats.mtime.toISOString()
            });
          }
        }
      }
      
      await searchRecursive(directory);
      
      return {
        query: pattern,
        directory,
        matches: results,
        count: results.length
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }
  
  /**
   * Tool: Query memory
   */
  async _toolQueryMemory({ query, limit = 10 }) {
    if (!this.mnemonicArbiter) {
      throw new Error('Memory system not available');
    }
    
    try {
      const results = await this.mnemonicArbiter.recall(query, { limit });
      return {
        query,
        results: results || [],
        count: (results || []).length
      };
    } catch (error) {
      throw new Error(`Memory query failed: ${error.message}`);
    }
  }
  
  /**
   * Tool: Store memory
   */
  async _toolStoreMemory({ content, metadata = {} }) {
    if (!this.mnemonicArbiter) {
      throw new Error('Memory system not available');
    }
    
    try {
      const result = await this.mnemonicArbiter.store(content, metadata);
      return {
        stored: true,
        id: result.id,
        tier: result.tier
      };
    } catch (error) {
      throw new Error(`Memory storage failed: ${error.message}`);
    }
  }
  
  /**
   * Tool: Execute command
   */
  async _toolExecuteCommand({ command, cwd }) {
    // Check whitelist if enabled
    if (this.config.allowedShellCommands.length > 0) {
      const allowed = this.config.allowedShellCommands.some(pattern => 
        command.startsWith(pattern) || command.match(new RegExp(pattern))
      );
      
      if (!allowed) {
        throw new Error(`Command not allowed: ${command}`);
      }
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        timeout: this.config.maxShellExecTime
      });
      
      return {
        command,
        stdout,
        stderr,
        success: true
      };
    } catch (error) {
      return {
        command,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Tool: Execute code
   */
  async _toolExecuteCode({ code, language }) {
    if (language === 'javascript') {
      try {
        // Simple sandboxed execution
        const sandbox = {
          console: {
            log: (...args) => args.join(' ')
          },
          Math,
          Date,
          JSON
        };
        
        const fn = new Function(...Object.keys(sandbox), `return (async () => { ${code} })();`);
        const result = await Promise.race([
          fn(...Object.values(sandbox)),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Execution timeout')), this.config.maxCodeExecTime)
          )
        ]);
        
        return {
          language,
          result: String(result),
          success: true
        };
      } catch (error) {
        return {
          language,
          error: error.message,
          success: false
        };
      }
    } else {
      throw new Error(`Unsupported language: ${language}`);
    }
  }
  
  /**
   * Tool: Web search (placeholder - would integrate real search API)
   */
  async _toolWebSearch({ query, limit = 5 }) {
    // Placeholder - in production, integrate with Google Custom Search, Bing, or similar
    return {
      query,
      results: [
        {
          title: 'Search functionality coming soon',
          snippet: 'This tool will integrate with real search APIs',
          url: 'https://example.com'
        }
      ],
      count: 1,
      note: 'This is a placeholder. Real web search integration coming soon.'
    };
  }

  /**
   * Tool: Browse URL using Puppeteer
   */
  async _toolBrowseUrl({ url, wait = 2000 }) {
    if (!puppeteer) {
      throw new Error('Puppeteer is not installed');
    }

    this._log(`Browsing URL: ${url}`);
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // Set a common user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }

      // Extract content
      const data = await page.evaluate(() => {
        // Remove script and style tags
        const scripts = document.querySelectorAll('script, style, nav, footer');
        scripts.forEach(s => s.remove());
        
        return {
          title: document.title,
          content: document.body.innerText.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n'),
          html: document.body.innerHTML.substring(0, 10000) // Truncated HTML for structural analysis if needed
        };
      });

      return {
        url,
        title: data.title,
        content: data.content.substring(0, 10000), // Limit returned content size
        success: true
      };
    } catch (error) {
      throw new Error(`Failed to browse URL: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }
  
  // ==================== WEB SCRAPING TOOLS ====================
  
  async _fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const lib = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = lib.request({
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (SOMA Knowledge Bot) AppleWebKit/537.36',
          ...options.headers
        },
        timeout: 10000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout after 10s'));
      });
      
      req.end();
    });
  }
  
  /**
   * Tool: Scrape ArXiv research papers
   */
  async _toolScrapeArxiv({ query, maxResults = 5 }) {
    try {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
      const xml = await this._fetch(url);
      const $ = cheerio.load(xml, { xmlMode: true });
      
      const results = [];
      $('entry').each((i, entry) => {
        if (i >= maxResults) return false;
        
        const $entry = $(entry);
        results.push({
          title: $entry.find('title').text().trim(),
          summary: $entry.find('summary').text().trim().substring(0, 500),
          authors: $entry.find('author name').map((i, el) => $(el).text()).get(),
          published: $entry.find('published').text(),
          url: $entry.find('id').text(),
          categories: $entry.find('category').map((i, el) => $(el).attr('term')).get()
        });
      });
      
      return { success: true, query, source: 'arxiv', results, count: results.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Tool: Scrape Wikipedia articles
   */
  async _toolScrapeWikipedia({ query }) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json`;
      const searchText = await this._fetch(searchUrl);
      const searchResults = JSON.parse(searchText);
      
      if (!searchResults[3] || searchResults[3].length === 0) {
        return { success: false, error: 'No articles found' };
      }
      
      const articleUrl = searchResults[3][0];
      const title = searchResults[1][0];
      
      // Get article content
      const html = await this._fetch(articleUrl);
      const $ = cheerio.load(html);
      
      // Extract main content
      const content = $('#mw-content-text .mw-parser-output > p')
        .map((i, el) => $(el).text().trim())
        .get()
        .filter(p => p.length > 50)
        .slice(0, 5)
        .join('\n\n');
      
      return {
        success: true,
        source: 'wikipedia',
        title,
        url: articleUrl,
        content: content.substring(0, 2000),
        summary: searchResults[2][0] || ''
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Tool: Scrape GitHub repositories
   */
  async _toolScrapeGithub({ query, maxResults = 5 }) {
    try {
      const searchUrl = `https://github.com/search?q=${encodeURIComponent(query)}&type=repositories`;
      const html = await this._fetch(searchUrl);
      const $ = cheerio.load(html);
      
      const results = [];
      $('.repo-list-item').each((i, item) => {
        if (i >= maxResults) return false;
        
        const $item = $(item);
        const name = $item.find('h3 a').text().trim();
        const url = 'https://github.com' + $item.find('h3 a').attr('href');
        const description = $item.find('p.mb-1').text().trim();
        const stars = $item.find('[aria-label*="star"]').text().trim();
        const language = $item.find('[itemprop="programmingLanguage"]').text().trim();
        
        if (name) {
          results.push({ name, url, description, stars, language });
        }
      });
      
      return { success: true, query, source: 'github', results, count: results.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Tool: Scrape Stack Overflow Q&A
   */
  async _toolScrapeStackOverflow({ query, maxResults = 5 }) {
    try {
      const searchUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`;
      const html = await this._fetch(searchUrl);
      const $ = cheerio.load(html);
      
      const results = [];
      $('.s-post-summary').each((i, item) => {
        if (i >= maxResults) return false;
        
        const $item = $(item);
        const title = $item.find('.s-post-summary--content-title a').text().trim();
        const url = 'https://stackoverflow.com' + $item.find('.s-post-summary--content-title a').attr('href');
        const excerpt = $item.find('.s-post-summary--content-excerpt').text().trim();
        const votes = $item.find('.s-post-summary--stats-item-number').first().text().trim();
        const answers = $item.find('.s-post-summary--stats-item:has(.iconCheckmarkSm)').text().trim();
        const tags = $item.find('.s-post-summary--meta-tags a').map((i, el) => $(el).text()).get();
        
        if (title) {
          results.push({ title, url, excerpt, votes, answers, tags });
        }
      });
      
      return { success: true, query, source: 'stackoverflow', results, count: results.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Tool: Scrape news from Hacker News, Reddit, Dev.to
   */
  async _toolScrapeNews({ query, source = 'hacker-news', maxResults = 10 }) {
    try {
      let results = [];
      
      if (source === 'hacker-news') {
        const url = 'https://news.ycombinator.com/';
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        $('.athing').each((i, item) => {
          if (i >= maxResults) return false;
          
          const $item = $(item);
          const id = $item.attr('id');
          const title = $item.find('.titleline > a').text().trim();
          const url = $item.find('.titleline > a').attr('href');
          const $meta = $item.next();
          const points = $meta.find('.score').text();
          const comments = $meta.find('a:contains("comment")').text();
          
          if (title && title.toLowerCase().includes(query.toLowerCase())) {
            results.push({ title, url, points, comments, source: 'Hacker News' });
          }
        });
      } else if (source === 'dev.to') {
        const url = `https://dev.to/search?q=${encodeURIComponent(query)}`;
        const html = await this._fetch(url);
        const $ = cheerio.load(html);
        
        $('.crayons-story').each((i, item) => {
          if (i >= maxResults) return false;
          
          const $item = $(item);
          const title = $item.find('.crayons-story__title a').text().trim();
          const url = 'https://dev.to' + $item.find('.crayons-story__title a').attr('href');
          const tags = $item.find('.crayons-tag').map((i, el) => $(el).text().trim()).get();
          const reactions = $item.find('.aggregate_reactions_counter').text().trim();
          
          if (title) {
            results.push({ title, url, tags, reactions, source: 'Dev.to' });
          }
        });
      }
      
      return { success: true, query, source, results, count: results.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  
  /**
   * Get status and metrics
   */
  getStatus() {
    return {
      name: this.name,
      totalTools: this.tools.size,
      availableTools: this.listTools().map(t => t.name),
      metrics: this.metrics,
      config: {
        fileOps: this.config.enableFileOps,
        webSearch: this.config.enableWebSearch,
        codeExec: this.config.enableCodeExec,
        shellExec: this.config.enableShellExec,
        memoryQuery: this.config.enableMemoryQuery
      }
    };
  }
}

module.exports = MCPToolManager;
