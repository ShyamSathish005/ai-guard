import { useEffect, useRef, useState, useCallback } from 'react';

// --- GLOBAL SINGLETON SCOPE ---
let sharedWorker = null;
let workerScriptUrl = null;
const pendingRequests = new Map();
const loadedPluginNames = new Set(); // Track which plugins are loaded globally

// The "Blob" injection happens here in the build step.
// For dev, we assume this string is injected or loaded.
// In the final build, this var is populated.
const INLINE_WORKER_CODE = `var z={CREDIT_CARD:/\\b(?:\\d{4}[ -]?){3}\\d{4}\\b/,EMAIL:/\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b/,API_KEY:/\\b(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36})\\b/,SSN:/\\b\\d{3}-\\d{2}-\\d{4}\\b/,IPV4:/\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b/,AWS_KEY:/\\b(AKIA[0-9A-Z]{16})\\b/,JWT:/\\beyJ[a-zA-Z0-9_-]*\\.eyJ[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]*\\b/};function P(r,n=[],l=!1,t=[],s=[]){let e=r,a=[],o=!0,i={...z};for(let c of s)c.name&&c.pattern&&(i[c.name]=c.pattern);let u=n.length>0?n:Object.keys(i),d=t.map(c=>typeof c=="string"?new RegExp(c):c);for(let c of u){let h=i[c];if(!h)continue;let m=new RegExp(h.source,"g"),w=r.match(m);if(w&&w.length>0){let f=w.filter(g=>!d.some(p=>p.test(g)));if(f.length>0&&(o=!1,a.push({type:c,matches:f}),l))for(let g of f)e=e.replace(g,\`[\${c}_REDACTED]\`)}}return{safe:o,findings:a,text:e}}function S(r){if(!r)return"";let n=r.trim();return n=n.replace(/^\`\`\`[a-zA-Z]*\\s*/,""),n=n.replace(/\\s*\`\`\`\$/,""),n}function _(r,n={}){if(!r)return"";let{last:l=!0}=n,t=r;t=t.replace(/<think>[\\s\\S]*?<\\/think>/gi,""),t=t.replace(/<think>[\\s\\S]*\$/gi,"");let s=/\`\`\`(?:json|json5|javascript|js)?\\s*([\\s\\S]*?)(?:\`\`\`|\$)/gi,e=[],a;for(;(a=s.exec(t))!==null;){let f=a[1].trim();f&&(f.startsWith("{")||f.startsWith("["))&&e.push(f)}if(e.length>0)return l?e[e.length-1]:e[0];let o=[],i=0,u=-1,d=!1,c=!1;for(let f=0;f<t.length;f++){let g=t[f];if(c){c=!1;continue}if(g==="\\\\"&&d){c=!0;continue}if(g==='"'&&!c){d=!d;continue}d||(g==="{"||g==="["?(i===0&&(u=f),i++):(g==="}"||g==="]")&&(i--,i===0&&u!==-1&&(o.push(t.slice(u,f+1)),u=-1)))}if(u!==-1&&i>0&&o.push(t.slice(u)),o.length>0)return l?o[o.length-1]:o[0];let h=t.indexOf("{"),m=t.indexOf("[");if(h===-1&&m===-1)return t.trim();let w=h===-1?m:m===-1?h:Math.min(h,m);return t.slice(w).trim()}function N(r,n={}){let{extract:l=!1}=n,t=l?_(r):S(r);if(!t||!t.trim())return"{}";let s=t.trim(),e=[],a=!1,o=!1;for(let i=0;i<s.length;i++){let u=s[i];if(o){o=!1;continue}if(u==="\\\\"&&a){o=!0;continue}if(u==='"'&&!o){a=!a,a?e.push('"'):e.length>0&&e[e.length-1]==='"'&&e.pop();continue}a||(u==="{"?e.push("{"):u==="["?e.push("["):u==="}"?e.length>0&&e[e.length-1]==="{"&&e.pop():u==="]"&&e.length>0&&e[e.length-1]==="["&&e.pop())}for(a&&(s+='"',e.length>0&&e[e.length-1]==='"'&&e.pop()),s=s.replace(/,\\s*\$/,"");e.length>0;){let i=e.pop();i==="{"?s+="}":i==="["&&(s+="]")}return s}var b=null,M=null,I=!1;async function Z(){if(!b){if(!I)throw new Error("Wasm Kernel is disabled in this build.");try{let r=await import("../core/repair_wasm.js");b=await(r.default||r)(),M=b.cwrap("repair_json","string",["string"])}catch(r){throw console.error("Failed to load Wasm kernel:",r),r}}}var x=new Map,y=new Map;async function J(r){let{name:n,url:l,module:t}=r;if(x.has(n))return{success:!0,name:n,cached:!0};if(y.has(n))return await y.get(n),{success:!0,name:n,cached:!0};let s=(async()=>{try{let e;if(t)e=t;else if(l)e=await import(l);else throw new Error("Plugin requires either url or module");return typeof e.init=="function"&&await e.init(),x.set(n,e),e}catch(e){throw y.delete(n),e}})();return y.set(n,s),await s,{success:!0,name:n}}async function L(r,n=null){let l=[],t=n?n.filter(s=>x.has(s)):Array.from(x.keys());for(let s of t){let e=x.get(s);if(e&&typeof e.check=="function")try{let a=await e.check(r);if(l.push({name:s,...a}),!a.safe)return{safe:!1,blockedBy:s,reason:a.reason||"Plugin blocked",score:a.score,results:l}}catch(a){l.push({name:s,error:a.message})}}return{safe:!0,results:l}}self.onmessage=async r=>{let{id:n,type:l,payload:t,options:s}=r.data;try{let e;switch(l){case"LOAD_PLUGIN":e=await J(t);break;case"UNLOAD_PLUGIN":let a=typeof t=="string"?t:t.name;x.delete(a),y.delete(a),e={success:!0,name:a};break;case"LIST_PLUGINS":e={plugins:Array.from(x.keys())};break;case"SCAN_TEXT":let o=typeof t=="string"?t:t?.text,i=s?.rules||t?.enabledRules||[],u=s?.redact??t?.redact??!1,d=s?.allow||t?.allow||[],c=s?.customRules||t?.customRules||[],h=s?.runPlugins??t?.runPlugins??!0,m=s?.plugins||t?.plugins||null;if(e=P(o,i,u,d,c),e.safe&&h&&x.size>0){let p=await L(o,m);p.safe?e.pluginResults=p.results:e={...e,safe:!1,blockedBy:p.blockedBy,reason:p.reason,score:p.score,pluginResults:p.results}}break;case"REPAIR_JSON":{let p=typeof t=="string"?t:t?.text,T=s?.extract??t?.extract??!1,R=s?.useWasm&&I,A;if(R){b||await Z();let O=T?_(p):S(p);A=M(O)}else A=N(p,{extract:T});let k=!1,E=null;try{E=JSON.parse(A),k=!0}catch{k=!1}e={fixedString:A,data:E,isValid:k,mode:R?"wasm":"js"}}break;case"EXTRACT_JSON":let w=typeof t=="string"?t:t?.text,f=s?.last??t?.last??!0;e={extracted:_(w,{last:f})};break;default:throw new Error(\`Unknown message type: \${l}\`)}self.postMessage({id:n,success:!0,payload:e})}catch(e){self.postMessage({id:n,success:!1,error:e.message})}};
`; 

function getWorker() {
  if (sharedWorker) return sharedWorker;

  if (typeof window === 'undefined') return null; // SSR protection

  // Create the Blob URL once
  if (!workerScriptUrl && INLINE_WORKER_CODE && INLINE_WORKER_CODE !== '/* INJECTED_BY_BUILD_SCRIPT */') {
    const blob = new Blob([INLINE_WORKER_CODE], { type: 'application/javascript' });
    workerScriptUrl = URL.createObjectURL(blob);
  }

  // Fallback for dev environment (loading from file)
  const url = workerScriptUrl || new URL('../worker/index.js', import.meta.url);

  sharedWorker = new Worker(url, { type: 'module' });

  // Global Message Listener
  sharedWorker.onmessage = (e) => {
    const { id, success, payload, error } = e.data;
    const req = pendingRequests.get(id);
    if (req) {
      clearTimeout(req.timeout);
      if (success) req.resolve(payload);
      else req.reject(new Error(error));
      pendingRequests.delete(id);
    }
  };

  // Handle worker errors (reject all pending requests)
  sharedWorker.onerror = (err) => {
    console.error('[react-ai-guard] Worker error:', err);
    pendingRequests.forEach((req, id) => {
      clearTimeout(req.timeout);
      req.reject(new Error('Worker error: ' + (err.message || 'Unknown')));
      pendingRequests.delete(id);
    });
  };

  return sharedWorker;
}

// --- THE HOOK ---
export function useAIGuard(config = {}) {
  const [pluginsReady, setPluginsReady] = useState(false);
  const [pluginErrors, setPluginErrors] = useState([]);
  const workerRef = useRef(null);
  const pluginsLoadedRef = useRef(false);

  const post = useCallback((type, payload, options, timeout = 30000) => {
    const worker = getWorker();
    if (!worker) return Promise.reject(new Error("Worker not initialized"));

    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingRequests.delete(id);
        reject(new Error(`Worker timeout (${timeout/1000}s)`));
      }, timeout);
      
      pendingRequests.set(id, { resolve, reject, timeout: timeoutId });
      worker.postMessage({ id, type, payload, options });
    });
  }, []);

  // Load plugins on mount (only once globally)
  useEffect(() => {
    workerRef.current = getWorker();
    
    const plugins = config.plugins || [];
    if (plugins.length === 0 || pluginsLoadedRef.current) {
      setPluginsReady(true);
      return;
    }

    const loadPlugins = async () => {
      const errors = [];
      
      for (const plugin of plugins) {
        // Plugin can be: { name, url } or { name, module } or a class with static props
        const pluginConfig = typeof plugin === 'function' 
          ? { name: plugin.pluginName, url: plugin.pluginUrl, module: plugin }
          : plugin;
        
        if (loadedPluginNames.has(pluginConfig.name)) {
          continue; // Already loaded globally
        }
        
        try {
          // Long timeout for model loading (120s)
          await post('LOAD_PLUGIN', pluginConfig, null, 120000);
          loadedPluginNames.add(pluginConfig.name);
        } catch (err) {
          errors.push({ name: pluginConfig.name, error: err.message });
          console.error(`[react-ai-guard] Failed to load plugin "${pluginConfig.name}":`, err);
        }
      }
      
      pluginsLoadedRef.current = true;
      setPluginErrors(errors);
      setPluginsReady(true);
    };

    loadPlugins();
  }, [config.plugins, post]);

  // v1.3.0: Enhanced scanInput with plugin support
  const scanInput = useCallback((text, options = {}) => {
    return post('SCAN_TEXT', text, { 
      rules: options.rules || config.rules, 
      redact: options.redact || config.redact,
      allow: options.allow || config.allow || [],
      customRules: options.customRules || config.customRules || [],
      runPlugins: options.runPlugins ?? config.runPlugins ?? true,
      plugins: options.plugins || null // Specific plugins to run, or null for all
    }, options.timeout || 60000); // Longer timeout when plugins involved
  }, [post, config.rules, config.redact, config.allow, config.customRules, config.runPlugins]);

  // v1.2.0: repairJson now supports extract mode for reasoning models
  const repairJson = useCallback((raw, options = {}) => {
    return post('REPAIR_JSON', raw, { extract: options.extract || false });
  }, [post]);

  // v1.2.0: Direct extraction API for reasoning model output
  const extractJson = useCallback((raw, options = {}) => {
    return post('EXTRACT_JSON', raw, { last: options.last ?? true });
  }, [post]);

  // v1.3.0: Plugin management
  const loadPlugin = useCallback(async (pluginConfig) => {
    const result = await post('LOAD_PLUGIN', pluginConfig, null, 120000);
    if (result.success) {
      loadedPluginNames.add(pluginConfig.name);
    }
    return result;
  }, [post]);

  const unloadPlugin = useCallback(async (name) => {
    const result = await post('UNLOAD_PLUGIN', { name });
    loadedPluginNames.delete(name);
    return result;
  }, [post]);

  const listPlugins = useCallback(() => {
    return post('LIST_PLUGINS', null);
  }, [post]);

  return { 
    scanInput, 
    repairJson, 
    extractJson,
    // Plugin API
    loadPlugin,
    unloadPlugin,
    listPlugins,
    pluginsReady,
    pluginErrors
  };
}

